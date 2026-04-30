import { useEffect, useMemo, useRef, useState } from 'react';
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
  Sparkles,
  Wand2,
  Save,
  Copy,
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

type NotificationEventClass = 'transactional' | 'alert' | 'promotional';
type NotificationTone = 'professional' | 'friendly' | 'urgent' | 'promotional' | 'informative';

type EventGroup = { key: string; label: string };
type EventDefinition = {
  key: string;
  label: string;
  group: string;
  class: NotificationEventClass;
  defaultTone: NotificationTone;
  variables: string[];
};

const DEFAULT_EVENT_GROUPS: EventGroup[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'payments', label: 'Payments' },
  { key: 'products', label: 'Products' },
  { key: 'account', label: 'Account' },
  { key: 'support', label: 'Support' },
];

const DEFAULT_EVENTS: EventDefinition[] = [
  { key: 'order_placed', label: 'Order placed', group: 'orders', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'order_confirmed', label: 'Order confirmed', group: 'orders', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'order_packed', label: 'Order packed', group: 'orders', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'order_shipped', label: 'Order shipped', group: 'orders', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}', '{{delivery_date}}'] },
  { key: 'out_for_delivery', label: 'Out for delivery', group: 'orders', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}', '{{delivery_date}}'] },
  { key: 'delivery_confirmed', label: 'Delivery confirmed', group: 'orders', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}', '{{order_id}}', '{{delivery_date}}'] },
  { key: 'order_canceled', label: 'Order canceled', group: 'orders', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'order_refunded', label: 'Order refunded', group: 'orders', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'payment_pending', label: 'Payment pending', group: 'payments', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'payment_confirmed', label: 'Payment confirmed', group: 'payments', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'payment_failed', label: 'Payment failed', group: 'payments', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'subscription_reminder', label: 'Subscription reminder', group: 'payments', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{delivery_date}}'] },
  { key: 'subscription_renewed', label: 'Subscription renewed', group: 'payments', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}'] },
  { key: 'subscription_failed', label: 'Subscription failed', group: 'payments', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{amount}}'] },
  { key: 'invoice_generated', label: 'Invoice generated', group: 'payments', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{amount}}'] },
  { key: 'refund_processed', label: 'Refund processed', group: 'payments', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}', '{{order_id}}'] },
  { key: 'product_approved', label: 'Product approved', group: 'products', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'product_rejected', label: 'Product rejected', group: 'products', class: 'alert', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'product_boosted', label: 'Product boosted', group: 'products', class: 'promotional', defaultTone: 'promotional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'boost_expiring_soon', label: 'Boost expiring soon', group: 'products', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{product_name}}', '{{delivery_date}}'] },
  { key: 'product_out_of_stock', label: 'Product out of stock', group: 'products', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'low_stock_alert', label: 'Low stock alert', group: 'products', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'product_verified', label: 'Product verified', group: 'products', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'verification_approved', label: 'Verification approved', group: 'products', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'verification_rejected', label: 'Verification rejected', group: 'products', class: 'alert', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'account_created', label: 'Account created', group: 'account', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}'] },
  { key: 'account_verified', label: 'Account verified', group: 'account', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}'] },
  { key: 'account_alert', label: 'Account alert', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'password_reset', label: 'Password reset', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'login_alert', label: 'Login alert', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'profile_updated', label: 'Profile updated', group: 'account', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}'] },
  { key: 'suspicious_activity_detected', label: 'Suspicious activity detected', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'dispute_opened', label: 'Dispute opened', group: 'support', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'dispute_updated', label: 'Dispute updated', group: 'support', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'dispute_resolved', label: 'Dispute resolved', group: 'support', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'support_ticket_received', label: 'Support ticket received', group: 'support', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}'] },
  { key: 'support_ticket_replied', label: 'Support ticket replied', group: 'support', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}'] },
  { key: 'seller_approved', label: 'Seller approved', group: 'support', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}'] },
  { key: 'seller_suspended', label: 'Seller suspended', group: 'support', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'payout_initiated', label: 'Payout initiated', group: 'support', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}'] },
  { key: 'payout_completed', label: 'Payout completed', group: 'support', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}'] },
];

export default function CreateSendNotification() {
  const TONES: NotificationTone[] = [
    'professional',
    'friendly',
    'urgent',
    'promotional',
    'informative',
  ];
  const [targetGroup, setTargetGroup] = useState('all_customers');
  const [specificUserId, setSpecificUserId] = useState('');
  const [notificationType, setNotificationType] = useState<string[]>(['inapp']);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<NotificationTone>('professional');
  const [contextType, setContextType] = useState('order_placed');
  const [customEventEnabled, setCustomEventEnabled] = useState(false);
  const [customEventKey, setCustomEventKey] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [eventGroups, setEventGroups] = useState<EventGroup[]>(DEFAULT_EVENT_GROUPS);
  const [eventLibrary, setEventLibrary] = useState<EventDefinition[]>(DEFAULT_EVENTS);
  const [aiSubjects, setAiSubjects] = useState<string[]>([]);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [runningABTest, setRunningABTest] = useState(false);
  const [abVariantA, setAbVariantA] = useState('');
  const [abVariantB, setAbVariantB] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedEvent = useMemo(
    () => eventLibrary.find((evt) => evt.key === contextType) || null,
    [contextType, eventLibrary],
  );
  const variableChips = useMemo(
    () =>
      Array.from(
        new Set([
          '{{username}}',
          '{{order_id}}',
          '{{product_name}}',
          '{{delivery_date}}',
          '{{amount}}',
          ...(selectedEvent?.variables || []),
        ]),
      ),
    [selectedEvent],
  );

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return eventLibrary;
    return eventLibrary.filter(
      (evt) => evt.label.toLowerCase().includes(q) || evt.key.toLowerCase().includes(q),
    );
  }, [eventLibrary, eventSearch]);

  useEffect(() => {
    let mounted = true;
    void adminNotificationsAPI
      .getNotificationEventLibrary()
      .then((res) => {
        if (!mounted) return;
        if (Array.isArray(res.groups) && res.groups.length) setEventGroups(res.groups);
        if (Array.isArray(res.events) && res.events.length) setEventLibrary(res.events);
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!customEventEnabled && selectedEvent?.defaultTone) {
      setTone(selectedEvent.defaultTone);
    }
  }, [customEventEnabled, selectedEvent]);

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

  const insertTextAtCursor = (text: string) => {
    const el = messageRef.current;
    if (!el) {
      setMessage((m) => (m ? `${m} ${text}` : text));
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = `${message.slice(0, start)}${text}${message.slice(end)}`;
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleGenerateWithAI = async () => {
    setSendError(null);
    if (!prompt.trim()) {
      setSendError('Describe what the notification should say.');
      return;
    }
    if (customEventEnabled && !customEventKey.trim()) {
      setSendError('Enter a custom event key.');
      return;
    }
    setAiLoading(true);
    try {
      const out = await adminNotificationsAPI.generateNotificationCopy({
        prompt: prompt.trim(),
        tone,
        contextType,
        customEventKey: customEventEnabled ? customEventKey.trim() : undefined,
        variables: selectedEvent?.variables || [],
      });
      setAiSubjects(out.subject || []);
      setAiMessages(out.messages || []);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImproveWithAI = async () => {
    setSendError(null);
    if (!message.trim()) {
      setSendError('Enter existing notification text first.');
      return;
    }
    setAiLoading(true);
    try {
      const out = await adminNotificationsAPI.improveNotificationCopy({
        subject,
        message,
      });
      setAiSubjects(out.subject || []);
      setAiMessages(out.messages || []);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'AI improve failed');
    } finally {
      setAiLoading(false);
    }
  };

  const usedVariables = useMemo(() => {
    const source = `${subject}\n${message}`;
    return variableChips.filter((v: string) => source.includes(v));
  }, [message, subject, variableChips]);

  const handleSaveAsTemplate = async () => {
    setSendError(null);
    if (!message.trim()) {
      setSendError('Message is required to save a template.');
      return;
    }
    if (customEventEnabled && !customEventKey.trim()) {
      setSendError('Enter a custom event key before saving.');
      return;
    }
    setSavingTemplate(true);
    try {
      await adminNotificationsAPI.createTemplate({
        name: subject?.trim() || `AI ${(customEventEnabled ? customEventKey : contextType) || 'notification'} template`,
        category: selectedEvent?.group || 'custom',
        type: notificationType.includes('email') ? 'email' : 'inapp',
        subject: subject?.trim() || '',
        content: message.trim(),
        variables: usedVariables,
        tone,
        contextType,
        eventType: customEventEnabled ? customEventKey.trim() : contextType,
        source: 'ai_generated',
      });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRunABTest = async () => {
    setSendError(null);
    if (!abVariantA.trim() || !abVariantB.trim()) {
      setSendError('Provide both A and B message variants.');
      return;
    }
    setRunningABTest(true);
    try {
      await adminNotificationsAPI.runNotificationABTest({
        targetGroup,
        type: notificationType.includes('email') ? 'email' : 'inapp',
        variantA: { subject: `${subject || 'Reaglex update'} (A)`, message: abVariantA.trim() },
        variantB: { subject: `${subject || 'Reaglex update'} (B)`, message: abVariantB.trim() },
      });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'A/B test failed');
    } finally {
      setRunningABTest(false);
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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Message Content</h3>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300 disabled:opacity-60"
              >
                <Save className="mr-1 inline h-3.5 w-3.5" />
                {savingTemplate ? 'Saving…' : 'Save as template'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    AI Message Generator
                  </h4>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Generate or improve copy</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what this notification should say..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border ${
                        tone === t
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <select
                  value={contextType}
                  onChange={(e) => {
                    setCustomEventEnabled(false);
                    setContextType(e.target.value);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {eventGroups.map((group) => {
                    const options = filteredEvents.filter((evt) => evt.group === group.key);
                    if (!options.length) return null;
                    return (
                      <optgroup key={group.key} label={group.label}>
                        {options.map((evt) => (
                          <option key={evt.key} value={evt.key}>
                            {evt.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={customEventEnabled}
                    onChange={(e) => setCustomEventEnabled(e.target.checked)}
                  />
                  Use custom event trigger
                </label>
                {customEventEnabled && (
                  <input
                    value={customEventKey}
                    onChange={(e) => setCustomEventKey(e.target.value)}
                    placeholder="e.g. seller_profile_recheck_due"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                )}
                {selectedEvent && !customEventEnabled && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Event class: {selectedEvent.class}. Suggested tone set to {selectedEvent.defaultTone}.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={aiLoading}
                    className="rounded-xl border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 disabled:opacity-60"
                  >
                    <Wand2 className="mr-2 inline h-4 w-4" />
                    {aiLoading ? 'Generating…' : 'Generate with AI'}
                  </button>
                  <button
                    type="button"
                    onClick={handleImproveWithAI}
                    disabled={aiLoading}
                    className="rounded-xl border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300 disabled:opacity-60"
                  >
                    {aiLoading ? 'Improving…' : 'Improve current text'}
                  </button>
                </div>
              </div>
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
                  ref={messageRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter notification message..."
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {variableChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => insertTextAtCursor(chip)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {(aiSubjects.length > 0 || aiMessages.length > 0) && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">AI Suggestions</p>
                  {aiSubjects.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Subject options</p>
                      {aiSubjects.map((s, i) => (
                        <div key={`${s}-${i}`} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                          <p className="text-sm text-gray-900 dark:text-white">{s}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSubject(s)}
                              className="rounded-md border border-emerald-400 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                            >
                              Use subject
                            </button>
                            <button
                              type="button"
                              onClick={async () => navigator.clipboard?.writeText(s)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300"
                            >
                              <Copy className="mr-1 inline h-3 w-3" />
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiMessages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Message options</p>
                      {aiMessages.map((m, i) => (
                        <div key={`${i}-${m.slice(0, 20)}`} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{m}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setMessage(m)}
                              className="rounded-md border border-emerald-400 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                            >
                              Use message
                            </button>
                            <button
                              type="button"
                              onClick={async () => navigator.clipboard?.writeText(m)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300"
                            >
                              <Copy className="mr-1 inline h-3 w-3" />
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">A/B Testing</h3>
            <textarea
              value={abVariantA}
              onChange={(e) => setAbVariantA(e.target.value)}
              placeholder="Variant A message..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <textarea
              value={abVariantB}
              onChange={(e) => setAbVariantB(e.target.value)}
              placeholder="Variant B message..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="button"
              onClick={handleRunABTest}
              disabled={runningABTest}
              className="w-full rounded-xl border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300 disabled:opacity-60"
            >
              {runningABTest ? 'Launching A/B test…' : 'Launch 50/50 A/B test'}
            </button>
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

