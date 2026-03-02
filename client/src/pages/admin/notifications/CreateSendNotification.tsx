import React, { useState } from 'react';
import {
  Send,
  Users,
  User,
  Filter,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  AlertTriangle,
  Paperclip,
  Eye,
  X,
} from 'lucide-react';

export default function CreateSendNotification() {
  const [targetGroup, setTargetGroup] = useState('all_customers');
  const [notificationType, setNotificationType] = useState<string[]>(['inapp']);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleTypeToggle = (type: string) => {
    setNotificationType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create & Send Notification</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create and send notifications to users
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Group */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Target Group</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { id: 'all_customers', label: 'All Customers', icon: Users },
                { id: 'all_sellers', label: 'All Sellers', icon: Users },
                { id: 'specific_user', label: 'Specific User', icon: User },
                { id: 'custom_segment', label: 'Custom Segment', icon: Filter },
              ].map((group) => {
                const Icon = group.icon;
                return (
                  <button
                    key={group.id}
                    onClick={() => setTargetGroup(group.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      targetGroup === group.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification Types */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Notification Types
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { id: 'inapp', label: 'In-App', icon: Bell },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'sms', label: 'SMS', icon: MessageSquare },
                { id: 'push', label: 'Push', icon: Smartphone },
                { id: 'system', label: 'System Alert', icon: AlertTriangle },
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleTypeToggle(type.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      notificationType.includes(type.id)
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Content */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Message Content</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter notification subject..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter notification message..."
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Paperclip className="mr-2 inline h-4 w-4" />
                  Attach File
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                >
                  <Eye className="mr-2 inline h-4 w-4" />
                  Preview
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</h3>
            <div className="space-y-3">
              <button className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
                <Send className="mr-2 inline h-4 w-4" />
                Send Now
              </button>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Schedule Send
              </button>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Test Send
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Quick Info</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                Use variables like <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                  {'{{username}}'}
                </code>{' '}
                in your message
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Available: <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                  {'{{order_id}}'}
                </code>
                , <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                  {'{{amount}}'}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <p className="mb-2 font-semibold text-gray-900 dark:text-white">{subject || 'Subject'}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {message || 'Message content will appear here...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

