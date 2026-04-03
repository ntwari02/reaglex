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
  CalendarClock,
} from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

function scheduledTargetLabel(targetGroup: string): string {
  if (targetGroup === 'all_sellers') return 'All Sellers';
  if (targetGroup === 'all_customers') return 'All Customers';
  return 'All Customers';
}

function scheduledChannelType(types: string[]): string {
  if (types.includes('system')) return 'system';
  if (types.includes('email') && !types.includes('inapp')) return 'email';
  return 'inapp';
}

export default function CreateSendNotification() {
  const [targetGroup, setTargetGroup] = useState('all_customers');
  const [specificUserId, setSpecificUserId] = useState('');
  const [notificationType, setNotificationType] = useState<string[]>(['inapp']);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleTypeToggle = (type: string) => {
    setNotificationType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSendNow = async () => {
    setSendError(null);
    setSendSuccess(false);
    setSending(true);
    try {
      await adminNotificationsAPI.sendNotification({
        targetGroup,
        types: notificationType.length ? notificationType : ['inapp'],
        subject,
        message,
        recipient: targetGroup === 'specific_user' ? 'user' : 'broadcast',
        specificUserId: targetGroup === 'specific_user' ? specificUserId.trim() : undefined,
      });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    setSendError(null);
    setSendSuccess(false);
    if (!scheduleAt) {
      setSendError('Pick a date and time for the schedule.');
      return;
    }
    if (targetGroup === 'specific_user') {
      setSendError('Scheduled sends use audience targets (customers or sellers). Use Send Now for one user, or choose All Customers / All Sellers.');
      return;
    }
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      setSendError('Schedule time must be in the future.');
      return;
    }
    setScheduling(true);
    try {
      const types = notificationType.length ? notificationType : ['inapp'];
      await adminNotificationsAPI.createScheduled({
        name: (subject || 'Scheduled notification').slice(0, 120),
        target: scheduledTargetLabel(targetGroup),
        scheduledFor: when.toISOString(),
        recurring: false,
        type: scheduledChannelType(types),
        subject: subject || 'Notification',
        body: message || '',
      });
      setSendSuccess(true);
      setShowSchedule(false);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Schedule failed');
    } finally {
      setScheduling(false);
    }
  };

  const handleTestSend = async () => {
    setSendError(null);
    setSendSuccess(false);
    const to = testEmail.trim();
    if (!to.includes('@')) {
      setSendError('Enter a valid email for test send.');
      return;
    }
    setTesting(true);
    try {
      await adminNotificationsAPI.sendNotification({
        targetGroup,
        types: ['email'],
        subject: subject || 'Test notification',
        message: message || '(empty body)',
        recipient: to,
        specificUserId: targetGroup === 'specific_user' ? specificUserId.trim() : undefined,
      });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Test send failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create & Send Notification</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create and send notifications to users. Sends via backend API.
        </p>
      </div>
      {sendError && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {sendError}
        </p>
      )}
      {sendSuccess && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          Notification sent successfully.
        </p>
      )}

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
            {targetGroup === 'specific_user' && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  User ID (Mongo ObjectId)
                </label>
                <input
                  type="text"
                  value={specificUserId}
                  onChange={(e) => setSpecificUserId(e.target.value)}
                  placeholder="e.g. 674a…"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Required for in-app delivery to one user. Find ID in User management.
                </p>
              </div>
            )}
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
              <button
                onClick={handleSendNow}
                disabled={sending}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-70"
              >
                <Send className="mr-2 inline h-4 w-4" />
                {sending ? 'Sending...' : 'Send Now'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSendError(null);
                  if (!scheduleAt) {
                    const d = new Date(Date.now() + 3600000);
                    d.setMinutes(0, 0, 0);
                    setScheduleAt(d.toISOString().slice(0, 16));
                  }
                  setShowSchedule(true);
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <CalendarClock className="mr-2 inline h-4 w-4" />
                Schedule send
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Test send (email only)</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testing}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-cyan-400 dark:border-gray-700 dark:text-gray-300 disabled:opacity-60"
              >
                {testing ? 'Sending test…' : 'Send test email'}
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
      {showSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !scheduling && setShowSchedule(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Schedule send</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              In-app and system rows fan out on the worker; email schedules send to the selected audience (batch cap
              applies).
            </p>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Send at (local)</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300"
                disabled={scheduling}
                onClick={() => setShowSchedule(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={scheduling}
                onClick={handleSchedule}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {scheduling ? 'Saving…' : 'Create schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

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

