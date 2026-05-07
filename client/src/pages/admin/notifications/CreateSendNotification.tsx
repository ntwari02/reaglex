import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Copy,
  Eye,
  Mail,
  MessageSquare,
  Mic,
  Paperclip,
  Save,
  Send,
  Sparkles,
  Smartphone,
  Wand2,
  X,
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
type UiTone = NotificationTone | 'formal' | 'luxury' | 'excited' | 'minimal';
type AudienceType =
  | 'all_customers'
  | 'all_sellers'
  | 'vendors'
  | 'all_users'
  | 'premium_members'
  | 'specific_group'
  | 'specific_user';
type MessageLength = 'short' | 'medium' | 'detailed';
type DeliveryGoal =
  | 'high_ctr'
  | 'readability'
  | 'mobile'
  | 'conversion'
  | 'engagement';
type CampaignStyle = 'promotion' | 'alert' | 'maintenance' | 'announcement' | 'security';

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

const STORAGE_KEY = 'reaglex_admin_notifications_draft_v2';
const AI_STORAGE_KEY = 'reaglex_admin_notifications_ai_v2';

const CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'inapp', label: 'In-App', icon: Bell },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'push', label: 'Push', icon: Smartphone },
  { id: 'system', label: 'System Alert', icon: AlertTriangle },
] as const;

const CHIP_PROMPTS = [
  'Write promotion',
  'Maintenance notice',
  'Urgent seller alert',
  'Holiday campaign',
  'Security update',
];

const SMART_ACTIONS = [
  'Improve Existing Text',
  'Rewrite',
  'Expand',
  'Shorten',
  'Translate',
  'Make More Professional',
  'Add CTA',
  'Add Urgency',
  'Simplify',
  'Humanize Tone',
  'Generate 3 Variations',
  'Generate Subject Line',
  'Generate Push Version',
  'Generate SMS Version',
  'Convert to Email Format',
  'Convert to Announcement',
];

function mapToneToApi(tone: UiTone): NotificationTone {
  if (tone === 'formal' || tone === 'luxury') return 'professional';
  if (tone === 'excited') return 'promotional';
  if (tone === 'minimal') return 'informative';
  return tone;
}

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 220));
  return `${mins} min read`;
}

function scoreInsights(text: string, subject: string, tone: UiTone) {
  const clean = text.trim();
  const len = clean.length;
  const readability = Math.max(45, Math.min(98, 96 - Math.floor(len / 14)));
  const mobile = len < 320 ? 92 : len < 520 ? 78 : 61;
  const spamRisk = /free|urgent|!!!|act now|guaranteed/gi.test(clean) ? 'Medium' : 'Low';
  const engagement = Math.max(51, Math.min(94, 60 + Math.floor(subject.length / 2)));
  const openRate = Math.max(22, Math.min(72, 30 + Math.floor(subject.length / 3)));
  return { readability, mobile, spamRisk, engagement, openRate, toneLabel: tone };
}

const ToneSelector = memo(function ToneSelector({
  tone,
  onChange,
}: {
  tone: UiTone;
  onChange: (tone: UiTone) => void;
}) {
  const tones: UiTone[] = ['professional', 'friendly', 'urgent', 'promotional', 'formal', 'luxury', 'excited', 'minimal'];
  return (
    <div className="ai-grid">
      {tones.map((option) => (
        <button key={option} type="button" className={`pill ${tone === option ? 'active' : ''}`} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  );
});

const AudienceSelector = memo(function AudienceSelector({
  audience,
  onChange,
}: {
  audience: AudienceType;
  onChange: (audience: AudienceType) => void;
}) {
  return (
    <select className="glass-select" value={audience} onChange={(e) => onChange(e.target.value as AudienceType)} aria-label="Audience selector">
      <option value="all_customers">Customers</option>
      <option value="all_sellers">Sellers</option>
      <option value="vendors">Vendors</option>
      <option value="all_users">All Users</option>
      <option value="premium_members">Premium Members</option>
      <option value="specific_group">Specific Group</option>
      <option value="specific_user">Specific User</option>
    </select>
  );
});

const PromptSuggestions = memo(function PromptSuggestions({
  onPick,
}: {
  onPick: (value: string) => void;
}) {
  return (
    <div className="chip-wrap">
      {CHIP_PROMPTS.map((chip) => (
        <button key={chip} type="button" className="chip" onClick={() => onPick(chip)}>
          {chip}
        </button>
      ))}
    </div>
  );
});

const AiInsightPanel = memo(function AiInsightPanel({
  message,
  subject,
  tone,
}: {
  message: string;
  subject: string;
  tone: UiTone;
}) {
  const metrics = useMemo(() => scoreInsights(message, subject, tone), [message, subject, tone]);
  return (
    <div className="insight-card">
      <h4>Smart Insights</h4>
      <p>Readability {metrics.readability}% • Open rate {metrics.openRate}% • Mobile {metrics.mobile}%</p>
      <p>Engagement prediction {metrics.engagement}% • Spam risk {metrics.spamRisk}</p>
      <p>Tone analysis: {metrics.toneLabel}</p>
    </div>
  );
});

export default function CreateSendNotification() {
  const [targetGroup, setTargetGroup] = useState<AudienceType>('all_customers');
  const [specificUserId, setSpecificUserId] = useState('');
  const [notificationType, setNotificationType] = useState<string[]>(['inapp']);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<UiTone>('professional');
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
  const [saveTick, setSaveTick] = useState('Not synced');
  const [messageLength, setMessageLength] = useState<MessageLength>('medium');
  const [deliveryGoal, setDeliveryGoal] = useState<DeliveryGoal>('engagement');
  const [campaignStyle, setCampaignStyle] = useState<CampaignStyle>('announcement');
  const [language, setLanguage] = useState('English');
  const [latestGenerated, setLatestGenerated] = useState('');
  const [attachHint, setAttachHint] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(true);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (eventGroups.some((group) => group.key === q)) {
      return eventLibrary.filter((evt) => evt.group === q);
    }
    return eventLibrary.filter(
      (evt) => evt.label.toLowerCase().includes(q) || evt.key.toLowerCase().includes(q),
    );
  }, [eventGroups, eventLibrary, eventSearch]);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<{
          subject: string;
          message: string;
          targetGroup: AudienceType;
          specificUserId: string;
          notificationType: string[];
          tone: UiTone;
          scheduleAt: string;
        }>;
        if (data.subject) setSubject(data.subject);
        if (data.message) setMessage(data.message);
        if (data.targetGroup) setTargetGroup(data.targetGroup);
        if (data.specificUserId) setSpecificUserId(data.specificUserId);
        if (data.notificationType?.length) setNotificationType(data.notificationType);
        if (data.tone) setTone(data.tone);
        if (data.scheduleAt) setScheduleAt(data.scheduleAt);
      }
      const aiRaw = localStorage.getItem(AI_STORAGE_KEY);
      if (aiRaw) {
        const aiData = JSON.parse(aiRaw) as Partial<{ prompt: string; aiSubjects: string[]; aiMessages: string[] }>;
        if (aiData.prompt) setPrompt(aiData.prompt);
        if (aiData.aiSubjects?.length) setAiSubjects(aiData.aiSubjects);
        if (aiData.aiMessages?.length) setAiMessages(aiData.aiMessages);
      }
    } catch {
      null;
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          subject,
          message,
          targetGroup,
          specificUserId,
          notificationType,
          tone,
          scheduleAt,
        }),
      );
      localStorage.setItem(
        AI_STORAGE_KEY,
        JSON.stringify({
          prompt,
          aiSubjects,
          aiMessages,
        }),
      );
      setSaveTick(`Synced ${new Date().toLocaleTimeString()}`);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [subject, message, targetGroup, specificUserId, notificationType, tone, scheduleAt, prompt, aiSubjects, aiMessages]);

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

  const handleGenerateWithAI = useCallback(async (smartAction?: string) => {
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
        prompt: `${prompt.trim()}\nAction: ${smartAction || 'Generate with AI'}\nAudience: ${targetGroup}\nLength: ${messageLength}\nCampaign style: ${campaignStyle}\nLanguage: ${language}\nDelivery optimization: ${deliveryGoal}`,
        tone: mapToneToApi(tone),
        contextType,
        customEventKey: customEventEnabled ? customEventKey.trim() : undefined,
        variables: selectedEvent?.variables || [],
      });
      setAiSubjects(out.subject || []);
      setAiMessages(out.messages || []);
      setLatestGenerated((out.messages || [])[0] || '');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  }, [prompt, customEventEnabled, customEventKey, targetGroup, messageLength, campaignStyle, language, deliveryGoal, tone, contextType, selectedEvent?.variables]);

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
      setLatestGenerated((out.messages || [])[0] || '');
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

  const handleSmartAction = useCallback(
    async (action: string) => {
      const nextPrompt = `${prompt || message || 'Notification draft'}\n${action}`;
      setPrompt(nextPrompt);
      await handleGenerateWithAI(action);
    },
    [handleGenerateWithAI, message, prompt],
  );

  const handleInsertIntoEditor = useCallback((next: string, replace: boolean) => {
    if (!next) return;
    if (replace) setMessage(next);
    else setMessage((prev) => (prev ? `${prev}\n\n${next}` : next));
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 2800);
  }, []);

  const readTime = useMemo(() => estimateReadTime(message), [message]);
  const intentSuggestion = useMemo(() => {
    const source = `${subject} ${prompt} ${message}`.toLowerCase();
    if (source.includes('discount') || source.includes('sale')) return { style: 'promotion', channel: 'email', when: '09:00 local time' };
    if (source.includes('urgent') || source.includes('security') || source.includes('alert')) return { style: 'alert', channel: 'push', when: 'Immediate' };
    if (source.includes('maintenance') || source.includes('downtime')) return { style: 'maintenance', channel: 'system', when: '30 mins before event' };
    return { style: 'announcement', channel: 'inapp', when: '13:00 local time' };
  }, [subject, prompt, message]);

  useEffect(() => {
    setCampaignStyle(intentSuggestion.style as CampaignStyle);
  }, [intentSuggestion.style]);

  return (
    <div className="notifications-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{`
        .notifications-page { background: radial-gradient(circle at top right,#f0f9ff 0%,#f8fafc 44%,#ecfeff 100%); }
        .page-header { padding: 24px 24px 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; }
        .page-subtitle { font-size: 13px; color: #475569; margin-top: 4px; max-width: 720px; }
        .top-bar { margin: 0 24px 12px; display: flex; align-items: center; gap: 12px; }
        .notif-type-tabs { display: flex; align-items: center; gap: 6px; }
        .tab-pill { padding: 7px 14px; border-radius: 999px; border: 1px solid #dbeafe; background: rgba(255,255,255,.7); color: #475569; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; transition: all .2s; }
        .tab-pill:hover { border-color: #7dd3fc; }
        .tab-pill.active { background: rgba(34,211,238,.12); border-color: #06b6d4; color: #0891b2; box-shadow: 0 0 0 3px rgba(34,211,238,.15); font-weight: 600; }
        .top-bar-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .btn-outline { border: 1px solid #dbeafe; border-radius: 10px; padding: 8px 14px; font-size: 13px; color: #0f172a; background: rgba(255,255,255,.85); display: inline-flex; align-items: center; gap: 6px; transition: all .2s; }
        .btn-outline:hover { box-shadow: 0 4px 16px rgba(15,23,42,.08); transform: translateY(-1px); }
        .send-now-btn { background: linear-gradient(135deg,#06b6d4,#22d3ee); color: #fff; border: none; border-radius: 10px; padding: 8px 18px; font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 8px 20px rgba(6,182,212,.35); }
        .two-panel-container { display: flex; flex-direction: row; flex: 1; overflow: hidden; border: 1px solid rgba(125,211,252,.4); border-radius: 16px; background: rgba(255,255,255,.8); backdrop-filter: blur(10px); margin: 0 24px 24px; min-height: calc(100vh - 180px); }
        .left-composer-panel { width: 68%; min-width: 0; display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid #e0f2fe; }
        .right-ai-panel { width: 32%; min-width: 320px; flex-shrink: 0; display: flex; flex-direction: column; overflow-y: auto; background: linear-gradient(180deg,rgba(255,255,255,.95),rgba(236,254,255,.95)); position: sticky; top: 0; max-height: calc(100vh - 180px); }
        .field-row { display: flex; align-items: center; min-height: 46px; border-bottom: 1px solid #f3f4f6; padding: 0 16px; }
        .field-label { width: 56px; flex-shrink: 0; font-size: 13px; color: #6b7280; font-weight: 500; }
        .field-content { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
        .target-pill { background: rgba(34,211,238,.12); border: 1px solid rgba(34,211,238,.35); color: #0891b2; border-radius: 99px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
        .target-group-btn { font-size: 12px; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; background: #fff; }
        .composer-toolbar { padding: 8px 16px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid #f3f4f6; position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.95); backdrop-filter: blur(8px); }
        .composer-toolbar button { font-size: 12px; padding: 5px 10px; border-radius: 99px; border: 1px solid #e5e7eb; background: #fafafa; color: #374151; display: inline-flex; align-items: center; gap: 5px; }
        .message-body-textarea { flex: 1; padding: 16px; border: none; outline: none; font-size: 14px; color: #334155; line-height: 1.7; resize: vertical; min-height: 320px; width: 100%; background: transparent; }
        .bottom-toolbar { padding: 10px 16px; border-top: 1px solid #f3f4f6; display: flex; align-items: center; gap: 14px; }
        .test-send-section { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .ai-header { padding: 14px; border-bottom: 1px solid #cffafe; background: linear-gradient(130deg,rgba(8,145,178,.1),rgba(34,211,238,.06)); }
        .ai-section-title { padding: 8px 14px 6px; font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; }
        .ai-generate-btns { padding: 12px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid #cffafe; position: sticky; bottom: 0; background: rgba(255,255,255,.95); z-index: 10; backdrop-filter: blur(8px); }
        .ab-testing-section { padding: 14px; border-top: 1px solid #f3f4f6; }
        .ab-launch-btn { width: 100%; height: 40px; border: 1.5px solid #0891b2; background: transparent; color: #0891b2; font-size: 13px; font-weight: 600; border-radius: 8px; }
        .schedule-modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
        .toast-notification { position: fixed; right: 24px; bottom: 24px; border-radius: 10px; padding: 10px 14px; font-size: 13px; z-index: 70; box-shadow: 0 14px 24px rgba(15,23,42,.18); }
        .ai-panel-mobile-header { display: none; }
        .floating-label { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .06em; margin-bottom: 4px; }
        .glass-input, .glass-select { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 12px; font-size: 13px; background: rgba(255,255,255,.75); color: #1e293b; }
        .glass-input:focus, .glass-select:focus, .message-body-textarea:focus { box-shadow: 0 0 0 3px rgba(34,211,238,.2); border-color: #06b6d4; }
        .chip-wrap { display:flex; flex-wrap:wrap; gap:8px; padding:0 14px 8px; }
        .chip { border:1px solid #bae6fd; background:#f0f9ff; color:#0369a1; border-radius:999px; padding:5px 10px; font-size:12px; }
        .ai-grid { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:6px; }
        .pill { border:1px solid #cbd5e1; border-radius:9px; padding:7px 8px; font-size:12px; text-transform:capitalize; color:#334155; background:#fff; }
        .pill.active { border-color:#06b6d4; background:#ecfeff; color:#0e7490; }
        .smart-actions { display:flex; gap:6px; overflow:auto; padding:0 14px 10px; scrollbar-width:none; }
        .smart-actions button { white-space:nowrap; border:1px solid #cbd5e1; border-radius:999px; background:#fff; padding:6px 10px; font-size:11px; color:#334155; }
        .output-card { margin:0 14px 12px; border:1px solid #dbeafe; border-radius:12px; background:#fff; box-shadow:0 8px 18px rgba(14,116,144,.08); }
        .output-scroll { max-height:180px; overflow:auto; font-size:13px; line-height:1.6; color:#334155; padding:12px; white-space:pre-wrap; }
        .insight-card { margin:0 14px 12px; border:1px dashed #7dd3fc; border-radius:12px; padding:10px; font-size:12px; color:#475569; background:rgba(236,254,255,.55); }
        .drag-target { border:1px dashed #7dd3fc; border-radius:10px; padding:7px 10px; font-size:12px; color:#0e7490; margin:8px 14px 12px; }
        @media (max-width: 768px) {
          .page-header { padding: 16px 14px 12px; }
          .page-title { font-size: 18px !important; }
          .page-subtitle { font-size: 12px !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .top-bar { flex-direction: column !important; gap: 10px !important; margin: 0 12px 10px !important; align-items: stretch !important; }
          .notif-type-tabs { overflow-x: auto !important; overflow-y: hidden !important; -webkit-overflow-scrolling: touch !important; flex-wrap: nowrap !important; scrollbar-width: none !important; padding-bottom: 2px; -webkit-mask-image: linear-gradient(to right, black 80%, transparent 100%); mask-image: linear-gradient(to right, black 80%, transparent 100%); }
          .notif-type-tabs::-webkit-scrollbar { display: none; }
          .notif-type-tabs .tab-pill { flex-shrink: 0 !important; }
          .top-bar-actions { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; margin-left: 0 !important; }
          .send-now-btn { grid-column: 1 / -1 !important; height: 46px !important; font-size: 15px !important; justify-content: center !important; }
          .auto-save-wrapper { grid-column: 1 / -1 !important; justify-content: flex-end !important; }
          .two-panel-container { flex-direction: column !important; overflow: visible !important; margin: 0 12px 16px !important; height: auto !important; }
          .left-composer-panel { order: 1 !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; }
          .right-ai-panel { order: 2 !important; width: 100% !important; max-width: unset !important; min-width: 0 !important; flex-shrink: unset !important; border-top: none !important; max-height: unset !important; position: static !important; }
          .composer-toolbar { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 7px !important; padding: 10px 12px !important; }
          .composer-toolbar button { width: 100% !important; justify-content: center !important; font-size: 11px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .message-body-textarea { min-height: 180px !important; height: 180px !important; font-size: 16px !important; }
          input, textarea, select { font-size: 16px !important; }
          .bottom-toolbar { flex-direction: column !important; gap: 10px !important; padding: 12px !important; }
          .test-send-section { width: 100% !important; flex-direction: column !important; gap: 8px !important; margin-left: 0 !important; }
          .test-send-section input, .test-send-section button { width: 100% !important; }
          .ai-panel-mobile-header { display: flex !important; align-items: center; gap: 8px; padding: 12px 14px; background: rgba(0,191,165,0.04); font-size: 13px; font-weight: 600; color: #111827; border-bottom: 1px solid #e5e7eb; }
          .ai-suggestion-header { padding: 14px 0 !important; min-height: 48px !important; }
          .ai-suggestion-header button { min-width: 36px !important; min-height: 36px !important; }
          .tone-pills-wrapper { flex-wrap: wrap !important; gap: 8px !important; padding: 10px 14px !important; }
          .ai-generate-btns { padding: 12px !important; position: static !important; }
          .ai-generate-btns button { height: 44px !important; font-size: 14px !important; }
          .ab-testing-section { padding: 14px 12px !important; }
          .ab-testing-section textarea { font-size: 16px !important; min-height: 70px !important; }
          .ab-launch-btn { height: 44px !important; font-size: 14px !important; }
          .schedule-modal { width: calc(100vw - 32px) !important; padding: 18px 14px !important; }
          .schedule-modal-btns { flex-direction: column !important; }
          .schedule-modal-btns button { width: 100% !important; height: 44px !important; }
          .toast-notification { bottom: 76px !important; left: 12px !important; right: 12px !important; width: auto !important; text-align: center !important; }
          .notifications-page { overflow-x: hidden !important; max-width: 100vw !important; }
          .notifications-page * { box-sizing: border-box !important; max-width: 100% !important; }
        }
        @media (max-width: 480px) {
          .field-row { flex-direction: column !important; align-items: flex-start !important; padding: 8px 12px !important; min-height: auto !important; }
          .field-label { width: auto !important; font-size: 11px !important; text-transform: uppercase; letter-spacing: .05em; padding-bottom: 4px !important; }
          .field-content { width: 100% !important; }
          .target-group-btn { margin-top: 6px !important; width: 100% !important; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
          .right-ai-panel { width: 36% !important; min-width: 280px !important; }
          .left-composer-panel .field-row { padding: 0 12px !important; }
          .top-bar { flex-wrap: wrap !important; gap: 8px !important; }
          .notif-type-tabs { flex: 0 0 100% !important; overflow-x: auto !important; scrollbar-width: none !important; }
          .notif-type-tabs::-webkit-scrollbar { display: none; }
          .top-bar-actions { margin-left: auto !important; }
        }
      `}</style>

      <div className="page-header">
        <h2 className="page-title">Notifications Center</h2>
        <p className="page-subtitle">
          Compose and send campaigns across email, in-app, SMS, push, and system alerts. The AI Writing Assistant helps draft, optimize, personalize, and format campaigns before sending.
        </p>
      </div>

      <div className="top-bar">
        <div className="notif-type-tabs">
          {CHANNELS.map((type) => {
            const Icon = type.icon;
            return (
              <button key={type.id} type="button" onClick={() => handleTypeToggle(type.id)} className={`tab-pill ${notificationType.includes(type.id) ? 'active' : ''}`}>
                <Icon className="h-3.5 w-3.5" />
                {type.label}
              </button>
            );
          })}
        </div>
        <div className="top-bar-actions">
          <div className="auto-save-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Auto-save • {saveTick}</span>
            <div style={{ width: 40, height: 22, borderRadius: 999, background: '#00bfa5', padding: 3 }}>
              <div style={{ width: 16, height: 16, borderRadius: 999, background: '#fff', marginLeft: 'auto' }} />
            </div>
          </div>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setSendError(null);
              if (!scheduleAt) {
                const d = new Date(Date.now() + 3600000);
                d.setMinutes(0, 0, 0);
              setScheduleAt(d.toISOString().slice(0, 16));
              }
              setShowSchedule(true);
            }}
          >
            <CalendarClock className="h-4 w-4" /> Schedule
          </button>
          <button type="button" className="btn-outline" onClick={handleSaveAsTemplate} disabled={savingTemplate}>
            <Save className="h-4 w-4" /> {savingTemplate ? 'Saving…' : 'Save as Draft'}
          </button>
          <button type="button" className="send-now-btn" onClick={handleSendNow} disabled={sending}>
            <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Now'}
          </button>
        </div>
      </div>

      <div className="two-panel-container">
        <div className="left-composer-panel">
          <div className="field-row">
            <div className="field-label">From</div>
            <div className="field-content" style={{ fontSize: 13, color: '#374151' }}>Admin &lt;email@gmail.com&gt;</div>
          </div>
          <div className="field-row">
            <div className="field-label">To</div>
            <div className="field-content" style={{ flexWrap: 'wrap' }}>
              <span className="target-pill">
                {targetGroup === 'all_sellers' ? 'All Sellers' : targetGroup === 'specific_user' ? 'Specific User' : targetGroup === 'specific_group' ? 'Specific Group' : 'All Customers'}
              </span>
              <input
                type="text"
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                placeholder={targetGroup === 'specific_user' ? 'Search user ID...' : 'Search products, brands, stores...'}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#374151', minWidth: 140 }}
              />
              <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value as AudienceType)} className="target-group-btn">
                <option value="all_customers">Target Group</option>
                <option value="all_sellers">All Sellers</option>
                <option value="specific_user">Specific User</option>
                <option value="custom_segment">Custom Segment</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field-label">Cc</div>
            <div className="field-content" style={{ fontSize: 12, color: '#6b7280' }}>
              None
              <button type="button" style={{ marginLeft: 8, color: '#00bfa5', fontSize: 12 }}>Bcc</button>
            </div>
          </div>

          <div className="composer-toolbar">
            <button type="button"><Copy className="h-3.5 w-3.5" /> Load existing Templates</button>
            <button type="button" onClick={handleSaveAsTemplate} disabled={savingTemplate}><Save className="h-3.5 w-3.5" /> Save as new template</button>
            <button type="button" onClick={handleImproveWithAI} disabled={aiLoading}><Wand2 className="h-3.5 w-3.5" /> Rephrase</button>
            <button type="button" onClick={() => void handleGenerateWithAI()} disabled={aiLoading}><Sparkles className="h-3.5 w-3.5" /> Analyze</button>
            <button type="button" onClick={() => insertTextAtCursor('\n/cta ')}>/cta</button>
            <button type="button" onClick={() => insertTextAtCursor('\n/urgent ')}>/urgent</button>
            <button type="button" onClick={() => insertTextAtCursor(' 😊')}>Emoji</button>
          </div>

          <div style={{ padding: '10px 16px 4px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Subject</div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter notification subject..."
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, color: '#111827', fontWeight: 500, borderBottom: '1px solid #f3f4f6', paddingBottom: 10, background: 'transparent' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#64748b' }}>
              <span>{subject.length} chars</span>
              <span>{readTime}</span>
            </div>
          </div>

          {notificationType.includes('email') && (
            <div style={{ padding: '6px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 4 }}>
              {['B', 'I', 'U', 'Link', '• List', '" Quote'].map((tool) => (
                <button key={tool} type="button" style={{ width: 28, height: 28, borderRadius: 6, fontSize: 12, color: '#374151' }}>
                  {tool}
                </button>
              ))}
            </div>
          )}

          <div className="tone-pills-wrapper" style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid #f3f4f6' }}>
            {(['professional', 'friendly', 'urgent', 'promotional', 'informative'] as NotificationTone[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t as UiTone)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${tone === t ? '#00bfa5' : '#e5e7eb'}`,
                  background: tone === t ? 'rgba(0,191,165,0.08)' : 'transparent',
                  color: tone === t ? '#00bfa5' : '#6b7280',
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            ref={messageRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="message-body-textarea"
            placeholder="Write your notification message here, or generate with AI →"
          />

          <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {variableChips.map((chip) => (
              <button key={chip} type="button" onClick={() => insertTextAtCursor(chip)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', fontSize: 11, color: '#6b7280' }}>
                {chip}
              </button>
            ))}
          </div>

          <div className="bottom-toolbar">
            <button type="button" style={{ color: '#9ca3af' }}><Paperclip className="h-5 w-5" /></button>
            <button type="button" style={{ color: '#9ca3af' }}>🔗</button>
            <button type="button" style={{ color: '#9ca3af' }}>{'{x}'}</button>
            <button type="button" style={{ color: '#9ca3af' }}>🖨️</button>
            <button type="button" style={{ color: '#9ca3af' }}>✅</button>
            <button type="button" onClick={() => setShowPreview(true)} style={{ color: '#9ca3af' }}><Eye className="h-5 w-5" /></button>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {message.length} chars • {estimateReadTime(message)}
            </div>
            <div className="test-send-section">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Test email"
                style={{ width: 180, fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px' }}
              />
              <button type="button" onClick={handleTestSend} disabled={testing} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                {testing ? 'Sending…' : 'Send test'}
              </button>
            </div>
          </div>
        </div>

        <div className="right-ai-panel">
          <div className="ai-panel-mobile-header" style={{ display: 'none' }}>
            ✨ AI Writing Assistant
            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
              Scroll down ↓
            </span>
          </div>
          <div className="ai-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Sparkles className="h-4 w-4" color="#06b6d4" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginLeft: 8 }}>AI Writing Assistant</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#0891b2' }}>● Live</span>
              <button type="button" className="btn-outline" style={{ marginLeft: 8, padding: '5px 8px' }} onClick={() => setAssistantOpen((v) => !v)}>
                {assistantOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
              Describe your notification and AI will generate a polished version optimized for engagement.
            </p>
          </div>

          {assistantOpen && (
            <>
          <div className="ai-section-title">Prompt</div>
          <div style={{ padding: '0 14px 10px' }}>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Write a premium maintenance notice for sellers with a clear CTA and mobile-first wording."
              className="glass-input"
              style={{ minHeight: 92, resize: 'vertical' }}
              aria-label="AI prompt input"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn-outline" onClick={() => setPrompt('')}><X className="h-4 w-4" /> Clear</button>
              <button type="button" className="btn-outline" onClick={() => setPrompt((p) => `${p}${p ? ' ' : ''}[voice note captured]`)}><Mic className="h-4 w-4" /> Voice</button>
            </div>
          </div>
          <div
            className="drag-target"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) setAttachHint(`Attached context: ${file.name}`);
            }}
          >
            Drag-and-drop context attachment {attachHint ? `• ${attachHint}` : ''}
          </div>
          <PromptSuggestions onPick={(value) => setPrompt((prev) => (prev ? `${prev}\n${value}` : value))} />

          <div className="ai-section-title">Generation Controls</div>
          <div style={{ padding: '0 14px 12px', display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div className="floating-label">Intent Event</div>
                <select className="glass-select" value={contextType} onChange={(e) => setContextType(e.target.value)}>
                  {filteredEvents.slice(0, 50).map((evt) => (
                    <option key={evt.key} value={evt.key}>
                      {evt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="floating-label">Event Group</div>
                <select className="glass-select" value={eventSearch} onChange={(e) => setEventSearch(e.target.value)}>
                  <option value="">All groups</option>
                  {eventGroups.map((grp) => (
                    <option key={grp.key} value={grp.key}>
                      {grp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
              <input type="checkbox" checked={customEventEnabled} onChange={(e) => setCustomEventEnabled(e.target.checked)} />
              Use custom event key
            </label>
            {customEventEnabled && (
              <input
                value={customEventKey}
                onChange={(e) => setCustomEventKey(e.target.value)}
                className="glass-input"
                placeholder="custom_event_key"
              />
            )}
            <div>
              <div className="floating-label">Tone</div>
              <ToneSelector tone={tone} onChange={setTone} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div className="floating-label">Audience</div>
                <AudienceSelector audience={targetGroup} onChange={setTargetGroup} />
              </div>
              <div>
                <div className="floating-label">Language</div>
                <select className="glass-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option>English</option>
                  <option>French</option>
                  <option>Kinyarwanda</option>
                  <option>Swahili</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div className="floating-label">Length</div>
                <select className="glass-select" value={messageLength} onChange={(e) => setMessageLength(e.target.value as MessageLength)}>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
              <div>
                <div className="floating-label">Campaign style</div>
                <select className="glass-select" value={campaignStyle} onChange={(e) => setCampaignStyle(e.target.value as CampaignStyle)}>
                  <option value="promotion">Promotion</option>
                  <option value="alert">Alert</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="announcement">Announcement</option>
                  <option value="security">Security</option>
                </select>
              </div>
            </div>
            <div>
              <div className="floating-label">Delivery Optimization</div>
              <select className="glass-select" value={deliveryGoal} onChange={(e) => setDeliveryGoal(e.target.value as DeliveryGoal)}>
                <option value="high_ctr">High CTR</option>
                <option value="readability">Better readability</option>
                <option value="mobile">Short mobile format</option>
                <option value="conversion">Conversion optimized</option>
                <option value="engagement">Engagement optimized</option>
              </select>
            </div>
          </div>

          <div className="ai-section-title">Smart Actions</div>
          <div className="smart-actions">
            {SMART_ACTIONS.map((action) => (
              <button key={action} type="button" onClick={() => void handleSmartAction(action)}>{action}</button>
            ))}
          </div>

          <div className="ai-section-title">AI Output</div>
          <div className="output-card">
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>Generated result</strong>
              <button type="button" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => navigator.clipboard.writeText(latestGenerated || message)}>Copy</button>
              <button type="button" style={{ fontSize: 11 }} onClick={() => handleInsertIntoEditor(latestGenerated, false)}>Insert</button>
              <button type="button" style={{ fontSize: 11 }} onClick={() => handleInsertIntoEditor(latestGenerated, true)}>Replace</button>
            </div>
            <div
              className="output-scroll"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setLatestGenerated(e.currentTarget.innerText)}
            >
              {latestGenerated || aiMessages[0] || 'Generate content to preview improved copy and compare versions.'}
            </div>
          </div>
          <AiInsightPanel message={latestGenerated || message} subject={subject} tone={tone} />
          <div style={{ padding: '0 14px 10px', fontSize: 12, color: '#475569' }}>
            Suggested channel: <strong>{intentSuggestion.channel}</strong> • Suggested send time: <strong>{intentSuggestion.when}</strong>
          </div>

          <div className="ai-section-title">Choose Subject Line</div>
          {(aiSubjects.length ? aiSubjects : ['']).map((item, i) => {
            const selected = item && item === subject;
            return (
              <div key={`sub-${i}`} style={{ borderBottom: '1px solid #f9fafb', padding: '0 14px', cursor: 'pointer', background: selected ? 'rgba(0,191,165,0.04)' : 'transparent', borderLeft: selected ? '2px solid #00bfa5' : '2px solid transparent' }}>
                <div className="ai-suggestion-header" style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                  <button type="button" onClick={() => item && setSubject(item)} style={{ width: 16, height: 16, borderRadius: 999, border: `1.5px solid ${selected ? '#00bfa5' : '#d1d5db'}`, background: selected ? '#00bfa5' : 'transparent' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: selected ? '#111827' : '#6b7280', marginLeft: 8, flex: 1 }}>Subject {i + 1}</span>
                  <button type="button" onClick={() => void handleGenerateWithAI()}>↺</button>
                  <button type="button" onClick={() => setAiSubjects((prev) => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
                <div style={{ padding: '0 0 10px 24px', fontSize: 12, color: '#6b7280', lineHeight: 1.5, fontStyle: item ? 'normal' : 'italic' }}>
                  {item || 'Empty — generate to fill'}
                </div>
              </div>
            );
          })}

          <div className="ai-section-title">Choose Body</div>
          {(aiMessages.length ? aiMessages : ['']).map((item, i) => {
            const selected = item && item === message;
            const preview = item ? `${item.split('\n').slice(0, 3).join('\n')}${item.split('\n').length > 3 ? '…' : ''}` : 'Empty — generate to fill';
            return (
              <div key={`msg-${i}`} style={{ borderBottom: '1px solid #f9fafb', padding: '0 14px', cursor: 'pointer', background: selected ? 'rgba(0,191,165,0.04)' : 'transparent', borderLeft: selected ? '2px solid #00bfa5' : '2px solid transparent' }}>
                <div className="ai-suggestion-header" style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                  <button type="button" onClick={() => item && setMessage(item)} style={{ width: 16, height: 16, borderRadius: 999, border: `1.5px solid ${selected ? '#00bfa5' : '#d1d5db'}`, background: selected ? '#00bfa5' : 'transparent' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: selected ? '#111827' : '#6b7280', marginLeft: 8, flex: 1 }}>Body {i + 1}</span>
                  <button type="button" onClick={handleImproveWithAI}>↺</button>
                  <button type="button" onClick={() => setAiMessages((prev) => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
                <div style={{ padding: '0 0 10px 24px', fontSize: 12, color: '#6b7280', lineHeight: 1.5, fontStyle: item ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                  {preview}
                </div>
              </div>
            );
          })}

          <div className="ab-testing-section">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 10 }}>A/B Testing</h3>
            <textarea value={abVariantA} onChange={(e) => setAbVariantA(e.target.value)} placeholder="Variant A message..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, minHeight: 80, marginBottom: 8 }} />
            <textarea value={abVariantB} onChange={(e) => setAbVariantB(e.target.value)} placeholder="Variant B message..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, minHeight: 80, marginBottom: 8 }} />
            <button type="button" className="ab-launch-btn" onClick={handleRunABTest} disabled={runningABTest}>
              {runningABTest ? 'Launching A/B test…' : 'Launch 50/50 A/B test'}
            </button>
          </div>

          <div className="ai-generate-btns">
            <button type="button" onClick={handleImproveWithAI} disabled={aiLoading} style={{ height: 38, borderRadius: 8, border: '1px solid #cbd5e1', color: '#6b7280', background: 'transparent' }}>
              Try Again
            </button>
            <button type="button" onClick={() => void handleGenerateWithAI()} disabled={aiLoading} style={{ height: 38, borderRadius: 8, background: 'linear-gradient(135deg,#06b6d4,#22d3ee)', color: 'white', fontWeight: 700, border: 'none' }}>
              {aiLoading ? 'Generating…' : 'Generate Now'}
            </button>
          </div>

          <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 className="h-3.5 w-3.5" color="#9ca3af" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe desired outcome..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#374151' }}
            />
            <button type="button" onClick={() => void handleGenerateWithAI()} style={{ color: '#9ca3af' }}>→</button>
          </div>
            </>
          )}
        </div>
      </div>

      {sendError && <p className="toast-notification" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{sendError}</p>}
      {sendSuccess && <p className="toast-notification" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>Content inserted successfully.</p>}

      {/* Preview Modal */}
      {showSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !scheduling && setShowSchedule(false)}
        >
          <div className="schedule-modal w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
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
            <div className="schedule-modal-btns">
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

