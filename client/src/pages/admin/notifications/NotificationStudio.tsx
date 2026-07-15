import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Bell,
  ChevronDown,
  Copy,
  Cpu,
  GitCompare,
  History,
  Loader2,
  Save,
  Send,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

type Channel = 'email' | 'sms' | 'push' | 'inapp';

const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'push', label: 'Push' },
  { id: 'inapp', label: 'In-App' },
];

const TARGET_PRESETS = [
  { value: 'All Users', label: 'All users' },
  { value: 'All Customers', label: 'Buyers only' },
  { value: 'All Sellers', label: 'Sellers only' },
  { value: 'Verified Sellers', label: 'Verified sellers' },
  { value: 'Custom Segment', label: 'Custom emails' },
] as const;

const VARIABLES = [
  '{{buyer_name}}',
  '{{seller_name}}',
  '{{order_id}}',
  '{{tracking_number}}',
  '{{delivery_date}}',
];

const AI_ACTIONS = [
  { id: 'generate', label: 'Generate' },
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'improve', label: 'Improve' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
  { id: 'humanize', label: 'Humanize' },
  { id: 'fix_grammar', label: 'Fix grammar' },
  { id: 'add_cta', label: 'Add CTA' },
  { id: 'add_urgency', label: 'Add urgency' },
  { id: 'translate', label: 'Translate' },
  { id: 'optimize', label: 'Optimize' },
] as const;

const QUICK_PROMPTS = [
  'Write a flash sale notification.',
  'Notify users about maintenance.',
  'Warn seller about fake products.',
  'Create escrow release message.',
];

const STUDIO_DRAFT_KEY = 'spacilly_notification_studio_drafts_v1';

type DraftVersion = { id: string; at: string; subject: string; body: string; channel: Channel };

function loadDrafts(): DraftVersion[] {
  try {
    const raw = localStorage.getItem(STUDIO_DRAFT_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveDrafts(list: DraftVersion[]) {
  localStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify(list.slice(0, 30)));
}

function useNarrowViewport(breakpoint = 768) {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [breakpoint]);
  return narrow;
}

function CollapsibleOnMobile({
  title,
  subtitle,
  icon: Icon,
  defaultOpenMobile,
  children,
  narrow,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpenMobile?: boolean;
  children: React.ReactNode;
  narrow: boolean;
}) {
  if (!narrow) {
    return (
      <div
        className="ns-card ns-surface rounded-2xl border p-4 sm:p-5 space-y-3"
        style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2 tracking-wide">
          <Icon className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] -mt-2 font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    );
  }
  return (
    <details
      className="ns-card ns-surface rounded-2xl border overflow-hidden group"
      style={{ borderColor: 'var(--border-card)' }}
      defaultOpen={defaultOpenMobile}
    >
      <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3 p-4 min-h-[52px] [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide truncate">{title}</p>
            {subtitle && (
              <p className="text-[10px] font-mono uppercase tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 opacity-60 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--divider)' }}>
        {children}
      </div>
    </details>
  );
}

export default function NotificationStudio() {
  const [channel, setChannel] = useState<Channel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetGroup, setTargetGroup] = useState<string>('All Customers');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [activeWithinDays, setActiveWithinDays] = useState<number | ''>('');
  const [customEmails, setCustomEmails] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [tone, setTone] = useState('professional');
  const [translateLang, setTranslateLang] = useState('French');
  const [aiBusy, setAiBusy] = useState(false);
  const [streamMode, setStreamMode] = useState(true);
  const [aiText, setAiText] = useState('');
  const [aiMeta, setAiMeta] = useState<{
    subject?: string;
    moderation?: { safe: boolean; warnings: string[]; blockedPatterns: string[] };
    scores?: { clarity: number; engagement: number; spamRisk: number; readability: number };
  } | null>(null);
  const [cursorOn, setCursorOn] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [accessRole, setAccessRole] = useState<'super_admin' | 'support_admin' | 'marketing_admin'>('super_admin');
  const [drafts, setDrafts] = useState<DraftVersion[]>(() => loadDrafts());
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePrev, setComparePrev] = useState('');
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const narrow = useNarrowViewport(768);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 3200);
  };

  const audienceFilter = useMemo(
    () => ({
      ...(country.trim() ? { country: country.trim() } : {}),
      ...(language.trim() ? { language: language.trim() } : {}),
      ...(activeWithinDays !== '' && Number(activeWithinDays) > 0
        ? { activeWithinDays: Number(activeWithinDays) }
        : {}),
    }),
    [country, language, activeWithinDays],
  );

  const refreshCounts = useCallback(async () => {
    if (targetGroup === 'Custom Segment') {
      const n = customEmails
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean).length;
      setRecipientCount(n);
      return;
    }
    try {
      const { count } = await adminNotificationsAPI.recipientCount({
        targetGroup,
        ...audienceFilter,
      });
      setRecipientCount(count);
    } catch {
      setRecipientCount(null);
    }
  }, [targetGroup, customEmails, audienceFilter]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    const run = async () => {
      try {
        const [dash, ana, integ, tpl, lg, sch, access] = await Promise.all([
          adminNotificationsAPI.getDashboard(),
          adminNotificationsAPI.getAnalytics(),
          adminNotificationsAPI.getIntegrationSettings(),
          adminNotificationsAPI.getTemplates(),
          adminNotificationsAPI.getLogs({}),
          adminNotificationsAPI.getScheduled(),
          adminNotificationsAPI.studioAccess().catch(() => ({ role: 'super_admin' as const })),
        ]);
        setDashboard(dash);
        setAnalytics(ana);
        setIntegrations(integ);
        setTemplates(tpl.templates || []);
        setLogs(lg.logs || []);
        setScheduled(sch.scheduled || []);
        setAccessRole(access.role);
      } catch {
        /* non-blocking */
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setCursorOn((c) => !c), 530);
    return () => window.clearInterval(t);
  }, []);

  const insertVariable = (v: string) => {
    const el = bodyRef.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd || start;
      const next = body.slice(0, start) + v + body.slice(end);
      setBody(next);
      window.requestAnimationFrame(() => {
        el.focus();
        const pos = start + v.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setBody((b) => `${b}${b && !b.endsWith(' ') ? ' ' : ''}${v}`);
    }
  };

  const pushDraft = () => {
    const d: DraftVersion = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      subject,
      body,
      channel,
    };
    const next = [d, ...drafts];
    setDrafts(next);
    saveDrafts(next);
    showToast('Draft saved locally');
  };

  const restoreDraft = (d: DraftVersion) => {
    setSubject(d.subject);
    setBody(d.body);
    setChannel(d.channel);
    showToast('Version restored');
  };

  const duplicateCampaign = () => {
    setSubject(`${subject} (copy)`.slice(0, 200));
    setBody(`${body}\n\n— duplicated —`);
    showToast('Duplicated — review before send');
  };

  const runAi = async (action: string, extra?: string) => {
    setAiBusy(true);
    setAiMeta(null);
    setAiText('');
    try {
      if (streamMode && action !== 'translate') {
        let acc = '';
        await adminNotificationsAPI.studioStream(
          {
            action,
            channel,
            subject,
            body: body || extra || 'Notification for Spacilly users.',
            tone,
            targetLanguage: action === 'translate' ? translateLang : undefined,
            extraInstruction: extra,
          },
          (chunk) => {
            acc += chunk;
            setAiText(acc);
          },
        );
        setAiMeta({
          subject,
          moderation: { safe: true, warnings: [], blockedPatterns: [] },
          scores: { clarity: 0, engagement: 0, spamRisk: 0, readability: 0 },
        });
      } else {
        const out = await adminNotificationsAPI.studioTransform({
          action,
          channel,
          subject,
          body: body || extra || 'Generate a professional notification.',
          tone,
          targetLanguage: action === 'translate' ? translateLang : undefined,
          extraInstruction: extra,
        });
        setAiText(out.body);
        if (out.subject) setAiMeta({ subject: out.subject, moderation: out.moderation, scores: out.scores });
        else setAiMeta({ moderation: out.moderation, scores: out.scores });
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setAiBusy(false);
    }
  };

  const applyAiSubject = () => {
    if (aiMeta?.subject) setSubject(aiMeta.subject);
  };

  const insertAiToEditor = () => {
    if (aiText) setBody((b) => (b ? `${b.trim()}\n\n${aiText}` : aiText));
    if (aiMeta?.subject && !subject) setSubject(aiMeta.subject);
    showToast('Inserted into composer');
  };

  const copyAi = async () => {
    await navigator.clipboard.writeText(aiText || '');
    showToast('Copied');
  };

  const sendNow = async () => {
    if (!subject.trim() || !body.trim()) {
      showToast('Subject and body required');
      return;
    }
    try {
      const specific =
        targetGroup === 'Custom Segment'
          ? customEmails.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
          : undefined;
      const filter = Object.keys(audienceFilter).length ? audienceFilter : undefined;

      if (channel === 'inapp') {
        let mapAudience = 'all_buyers';
        if (targetGroup === 'All Sellers') mapAudience = 'all_sellers';
        else if (targetGroup === 'Verified Sellers') mapAudience = 'verified_sellers';
        else if (targetGroup === 'All Users') mapAudience = 'everyone';
        else if (targetGroup === 'All Customers') mapAudience = 'all_buyers';
        await adminNotificationsAPI.inAppBroadcast({
          title: subject.slice(0, 220),
          message: body,
          targetAudience: mapAudience,
          type: 'system_announcement',
          priority: 'medium',
        });
        showToast('In-app notification published');
        void refreshCounts();
        return;
      }

      if (channel !== 'email') {
        showToast('SMS/Push sending is wired through provider integrations; use email for immediate broadcast or connect FCM / OneSignal in settings.');
        return;
      }

      const res = await adminNotificationsAPI.sendComposerBroadcast({
        targetGroup,
        specificEmails: specific,
        notificationType: 'email',
        subject,
        body,
        audienceFilter: filter,
      });
      showToast(res.message || 'Sent');
      void refreshCounts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Send failed');
    }
  };

  const scheduleSend = async () => {
    if (!scheduleAt) {
      showToast('Pick schedule time');
      return;
    }
    try {
      const specific =
        targetGroup === 'Custom Segment'
          ? customEmails.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
          : undefined;
      await adminNotificationsAPI.sendComposerBroadcast({
        targetGroup,
        specificEmails: specific,
        notificationType: channel,
        subject,
        body,
        scheduledAt: new Date(scheduleAt).toISOString(),
        recurring,
        audienceFilter: Object.keys(audienceFilter).length ? audienceFilter : undefined,
      });
      showToast('Scheduled');
      const sch = await adminNotificationsAPI.getScheduled();
      setScheduled(sch.scheduled || []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Schedule failed');
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) {
      showToast('Enter test email');
      return;
    }
    try {
      await adminNotificationsAPI.sendComposerBroadcast({
        isTestSend: true,
        testEmail: testEmail.trim(),
        notificationType: 'email',
        subject,
        body,
      });
      showToast('Test email sent');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Test failed');
    }
  };

  const studioRole = accessRole;

  const integrationRows = useMemo(() => {
    const rows = [
      { id: 'smtp', label: 'SMTP', ready: Boolean(integrations?.smtp?.host) },
      { id: 'resend', label: 'Resend', ready: true },
      { id: 'sendgrid', label: 'SendGrid', ready: false },
      { id: 'mailgun', label: 'Mailgun', ready: false },
      { id: 'onesignal', label: 'OneSignal', ready: false },
      { id: 'fcm', label: 'Firebase FCM', ready: Boolean(integrations?.push?.provider) },
    ];
    return rows;
  }, [integrations]);

  const renderAiPanel = (compact: boolean) => (
    <div
      className={cn(
        'ns-ai-commerce ns-ai-panel flex flex-col rounded-2xl border min-h-[280px]',
        compact ? 'gap-3 p-3' : 'gap-4 p-4 md:p-5 min-h-[320px]',
        'border-[color-mix(in_srgb,var(--brand-primary)_35%,var(--border-card))]',
        'bg-[color-mix(in_srgb,var(--card-bg)_75%,transparent)]',
        'shadow-[0_0_40px_-12px_color-mix(in_srgb,var(--brand-primary)_45%,transparent),var(--shadow-lg)]',
        'backdrop-blur-xl',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden">
            <span
              className="absolute inset-0 opacity-90"
              style={{ background: 'var(--gradient-brand-cta)' }}
            />
            <Sparkles className="relative h-5 w-5 text-[var(--text-on-accent)]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              Neural copy engine
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest truncate" style={{ color: 'var(--text-muted)' }}>
              Gemini flash · {studioRole.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <label
          className="flex items-center gap-2 text-[11px] cursor-pointer shrink-0 rounded-full border px-2.5 py-1.5"
          style={{ borderColor: 'var(--divider)', color: 'var(--text-muted)' }}
        >
          <input type="checkbox" checked={streamMode} onChange={(e) => setStreamMode(e.target.checked)} className="accent-[var(--brand-primary)]" />
          Stream
        </label>
      </div>

      <div
        className={cn(
          'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin',
          compact ? 'max-h-[120px] flex-wrap sm:flex-nowrap' : '',
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {AI_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={aiBusy}
            onClick={() => void runAi(a.id)}
            className={cn(
              'snap-start shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold transition-all duration-200',
              'min-h-[44px] active:scale-[0.97]',
              'hover:border-[color-mix(in_srgb,var(--brand-primary)_50%,var(--border-card))]',
              'hover:shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--brand-primary)_40%,transparent)]',
            )}
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          Quick prompts
        </p>
        <div className="flex flex-col gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={aiBusy}
              onClick={() => void runAi('generate', q)}
              className="text-left rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px] active:scale-[0.99]"
              style={{
                borderColor: 'var(--divider)',
                color: 'var(--text-secondary)',
                background: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {aiMeta?.scores && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {(
            [
              ['Clarity', aiMeta.scores.clarity],
              ['Engagement', aiMeta.scores.engagement],
              ['Spam risk', aiMeta.scores.spamRisk],
              ['Readability', aiMeta.scores.readability],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--divider)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span className="float-right font-mono" style={{ color: 'var(--text-primary)' }}>
                {v || '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {aiMeta?.moderation && (aiMeta.moderation.warnings.length > 0 || aiMeta.moderation.blockedPatterns.length > 0) && (
        <div
          className="rounded-xl border px-3 py-2 text-xs space-y-1"
          style={{
            borderColor: 'var(--badge-warning-border)',
            background: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
          }}
        >
          <p className="font-semibold">Moderation</p>
          {[...aiMeta.moderation.warnings, ...aiMeta.moderation.blockedPatterns].map((w, i) => (
            <p key={i}>· {w}</p>
          ))}
        </div>
      )}

      <div
        className={cn(
          'relative flex-1 min-h-[120px] rounded-xl border p-3 text-sm leading-relaxed overflow-y-auto',
          compact ? 'max-h-[min(42vh,220px)]' : 'max-h-[min(50vh,280px)]',
        )}
        style={{
          borderColor: 'color-mix(in srgb, var(--brand-primary) 15%, var(--divider))',
          background: 'color-mix(in srgb, var(--card-bg) 82%, var(--brand-tint))',
          color: 'var(--text-primary)',
          boxShadow: 'inset 0 0 24px -20px color-mix(in srgb, var(--brand-primary) 15%, transparent)',
        }}
      >
        {aiBusy && !aiText && (
          <div className="shimmer h-4 w-3/4 rounded bg-[var(--bg-skeleton)] animate-pulse mb-2" />
        )}
        {aiText || (
          <span style={{ color: 'var(--text-muted)' }}>AI output appears here — choose an action or quick prompt.</span>
        )}
        {aiText && (
          <span className={cn('inline-block w-2 h-4 ml-0.5 align-middle bg-[var(--brand-primary)]', cursorOn ? 'opacity-100' : 'opacity-30')} />
        )}
      </div>

      <label className="text-xs flex flex-col gap-1" style={{ color: 'var(--text-muted)' }}>
        Translate target language
        <input
          value={translateLang}
          onChange={(e) => setTranslateLang(e.target.value)}
          placeholder="e.g. Kinyarwanda"
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
        />
      </label>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button
          type="button"
          onClick={copyAi}
          disabled={!aiText}
          className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-bold min-h-[44px]"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
        >
          <Copy className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Copy</span>
        </button>
        <button
          type="button"
          onClick={pushDraft}
          className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-bold min-h-[44px]"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
        >
          <Save className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Save</span>
        </button>
        <button
          type="button"
          onClick={insertAiToEditor}
          disabled={!aiText}
          className="col-span-2 inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold min-h-[44px] text-[var(--text-on-accent)] sm:col-span-1"
          style={{
            background: 'var(--gradient-brand-cta)',
            boxShadow: '0 0 24px color-mix(in srgb, var(--brand-primary) 35%, transparent), var(--shadow-cta)',
          }}
        >
          <Wand2 className="h-3.5 w-3.5 shrink-0" /> Insert to editor
        </button>
        <button
          type="button"
          onClick={() => {
            setComparePrev(body);
            setCompareOpen(true);
          }}
          disabled={!aiText}
          className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-bold min-h-[44px]"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
        >
          <GitCompare className="h-3.5 w-3.5 shrink-0" /> Compare
        </button>
        {aiMeta?.subject && (
          <button
            type="button"
            onClick={applyAiSubject}
            className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-bold min-h-[44px] col-span-2 sm:col-span-1"
            style={{ borderColor: 'var(--brand-border-subtle)', color: 'var(--text-primary)' }}
          >
            Use AI subject
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'ns-root relative w-full max-w-[100vw] overflow-x-hidden',
        'space-y-5 sm:space-y-6',
        'pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] lg:pb-10',
        'px-1 sm:px-0',
      )}
      style={{ color: 'var(--text-primary)' }}
    >
      <style>{`
        @keyframes ns-shimmer { 100% { transform: translateX(100%); } }
        @keyframes ns-pulse-glow {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes ns-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          15% { opacity: 0.06; }
          85% { opacity: 0.06; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .ns-root .shimmer { position: relative; overflow: hidden; }
        .ns-root .shimmer::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand-primary) 28%, transparent), transparent);
          animation: ns-shimmer 1.2s infinite;
        }
        .ns-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(color-mix(in srgb, var(--border-visible) 22%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--border-visible) 18%, transparent) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 85% 70% at 50% -10%, black 25%, transparent 70%);
          opacity: 0.35;
        }
        .ns-shell::after {
          content: '';
          position: fixed;
          left: 0; right: 0; top: 0; height: 120%;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--brand-primary) 8%, transparent) 0%,
            transparent 28%,
            transparent 100%
          );
          animation: ns-scan 14s linear infinite;
        }
        .ns-card {
          position: relative;
          overflow: hidden;
        }
        .ns-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--brand-primary) 55%, transparent),
            color-mix(in srgb, var(--border-card) 80%, transparent) 40%,
            color-mix(in srgb, var(--brand-primary) 25%, transparent)
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.55;
        }
        .ns-surface {
          background: color-mix(in srgb, var(--card-bg) 88%, var(--bg-page));
          box-shadow: var(--shadow-card), 0 0 60px -30px color-mix(in srgb, var(--brand-primary) 25%, transparent);
        }
        .ns-stat-pill {
          box-shadow: inset 0 1px 0 color-mix(in srgb, var(--brand-primary) 15%, transparent);
        }
        .ns-hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .ns-hide-scrollbar::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .ns-shell::after { animation-duration: 20s; opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ns-shell::after { animation: none !important; opacity: 0; }
          .ns-root .shimmer::after { animation: none !important; }
        }
      `}</style>

      <div className="ns-shell pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="relative z-[1]">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-[92] rounded-2xl border px-4 py-3 text-sm shadow-xl max-w-[min(92vw,360px)] left-1/2 -translate-x-1/2 text-center font-medium"
          style={{
            bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
            background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
            borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, var(--border-card))',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast}
        </motion.div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] mb-1.5" style={{ color: 'var(--brand-primary)' }}>
            Spacilly · broadcast
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
            <span className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl overflow-hidden shrink-0">
              <Bell className="relative h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-primary)]" />
            </span>
            <span className="min-w-0 bg-gradient-to-r from-[var(--text-primary)] to-[color-mix(in_srgb,var(--text-primary)_55%,var(--brand-primary))] bg-clip-text text-transparent [text-shadow:0_0_40px_color-mix(in_srgb,var(--brand-primary)_18%,transparent)]">
              Notification Studio
            </span>
          </h1>
          <p className="text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <Cpu className="inline h-3.5 w-3.5 mr-1 align-text-bottom opacity-70" />
            AI-assisted campaigns — optimized for thumb-friendly control on small screens.
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto ns-hide-scrollbar pb-1 -mx-1 px-1 snap-x snap-mandatory md:flex-wrap md:overflow-visible">
          {integrationRows.map((r) => (
            <span
              key={r.id}
              className="snap-start shrink-0 rounded-full border px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide"
              style={{
                borderColor: r.ready ? 'var(--badge-success-border)' : 'var(--divider)',
                color: r.ready ? 'var(--badge-success-text)' : 'var(--text-muted)',
                background: r.ready ? 'var(--badge-success-bg)' : 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)',
                boxShadow: r.ready ? '0 0 14px -4px color-mix(in srgb, var(--badge-success-text) 35%, transparent)' : 'none',
              }}
            >
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Analytics — horizontal snap on phones */}
      <motion.section layout className="relative">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2 md:hidden" style={{ color: 'var(--text-muted)' }}>
          Telemetry · swipe
        </p>
        <div
          className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto ns-hide-scrollbar pb-2 -mx-1 px-1 snap-x snap-mandatory md:overflow-visible"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {[
            { label: 'Sent (mo)', v: dashboard?.stats?.totalSent ?? '—' },
            { label: 'Delivered %', v: dashboard?.stats?.deliveryRate ?? '—' },
            { label: 'Failed', v: dashboard?.stats?.failedCount ?? '—' },
            { label: 'Scheduled', v: dashboard?.stats?.scheduledCount ?? '—' },
            { label: 'Open ✲', v: analytics?.metrics?.emailOpenRate ?? '—' },
            { label: 'CTR ✲', v: analytics?.metrics?.clickThroughRate ?? '—' },
          ].map((x) => (
            <div
              key={x.label}
              className="ns-stat-pill ns-card ns-surface snap-start shrink-0 min-w-[132px] md:min-w-0 rounded-2xl border p-3 sm:p-3.5"
              style={{
                borderColor: 'var(--border-card)',
                background: 'color-mix(in srgb, var(--card-bg) 82%, var(--bg-page))',
              }}
            >
              <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {x.label}
              </p>
              <p className="text-base sm:text-lg font-mono font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {x.v}
              </p>
            </div>
          ))}
        </div>
      </motion.section>
      <p className="text-[10px] leading-snug px-0.5" style={{ color: 'var(--text-faint)' }}>
        ✲ Approximate from logs. Providers: SendGrid, Resend, OneSignal, FCM-ready.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 md:gap-6 items-start">
        {/* Left stack */}
        <div className="space-y-4 md:space-y-6 min-w-0">
          {/* Audience */}
          <section
            className="ns-card ns-surface rounded-2xl border p-4 sm:p-5 space-y-3"
            style={{ borderColor: 'var(--border-card)' }}
          >
            <h2 className="text-sm font-bold flex items-center gap-2 tracking-wide">
              <Zap className="h-4 w-4 text-[var(--brand-primary)] drop-shadow-[0_0_8px_color-mix(in_srgb,var(--brand-primary)_45%,transparent)]" />
              Audience selection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
                Preset
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px] sm:min-h-0"
                  style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                >
                  {TARGET_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs flex flex-col justify-end">
                <span style={{ color: 'var(--text-muted)' }}>Estimated reach</span>
                <span className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {recipientCount ?? '—'}
                </span>
              </div>
              <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
                Country (address)
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="RW"
                  className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px] sm:min-h-0"
                  style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                />
              </label>
              <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
                Language pref.
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en"
                  className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px] sm:min-h-0"
                  style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                />
              </label>
              <label className="text-xs space-y-1 block sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
                Active within (days, uses profile activity proxy)
                <input
                  type="number"
                  min={1}
                  value={activeWithinDays}
                  onChange={(e) => setActiveWithinDays(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px] sm:min-h-0"
                  style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                />
              </label>
              {targetGroup === 'Custom Segment' && (
                <label className="text-xs space-y-1 block sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
                  Emails (comma / newline)
                  <textarea
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-mono"
                    style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Composer */}
          <section
            className="ns-card ns-surface rounded-2xl border p-4 sm:p-5 space-y-4"
            style={{ borderColor: 'var(--border-card)' }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold tracking-wide">Notification composer</h2>
              <div
                className="flex rounded-2xl border p-1 gap-1 overflow-x-auto ns-hide-scrollbar snap-x max-w-full"
                style={{
                  borderColor: 'var(--divider)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {CHANNELS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id)}
                    className={cn(
                      'snap-center shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[44px] min-w-[4.75rem]',
                      channel === c.id ? 'text-[var(--text-on-accent)] scale-[1.02]' : 'text-[var(--text-secondary)]',
                    )}
                    style={
                      channel === c.id
                        ? {
                            background: 'var(--gradient-brand-cta)',
                            boxShadow: '0 0 20px color-mix(in srgb, var(--brand-primary) 35%, transparent), var(--shadow-cta)',
                          }
                        : { background: 'transparent' }
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
              Tone
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px] sm:min-h-0"
                style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
              >
                {['professional', 'friendly', 'urgent', 'promotional', 'informative'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                Variables
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-1">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="rounded-lg border px-2.5 py-2 text-[10px] sm:py-1 font-mono min-h-[40px] sm:min-h-0 active:scale-[0.98]"
                    style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
              Template
              <select
                className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px] sm:min-h-0"
                style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value);
                  if (t) {
                    setSubject(t.subject || '');
                    setBody(t.content || t.body || '');
                  }
                }}
                defaultValue=""
              >
                <option value="">— Load template —</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border px-3 py-3 sm:py-2 text-base sm:text-sm min-h-[48px]"
                style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
              />
            </label>
            <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
              Body
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={narrow ? 10 : 8}
                className="w-full rounded-xl border px-3 py-3 text-base sm:text-sm leading-relaxed min-h-[12rem] sm:min-h-0"
                style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
              />
            </label>
          </section>

          {/* Live preview */}
          <section
            className="ns-card ns-surface rounded-2xl border p-4 sm:p-5 space-y-2"
            style={{ borderColor: 'var(--border-card)' }}
          >
            <h2 className="text-sm font-bold tracking-wide">Live preview</h2>
            <div
              className="rounded-xl border p-4 max-h-[min(50vh,280px)] sm:max-h-[280px] overflow-y-auto text-sm"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-primary) 22%, var(--divider))',
                background: 'color-mix(in srgb, var(--bg-secondary) 88%, var(--brand-tint))',
                boxShadow: 'inset 0 0 40px -28px color-mix(in srgb, var(--brand-primary) 20%, transparent)',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {channel} · preview
              </p>
              <p className="font-semibold">{subject || 'Subject line'}</p>
              <p className="mt-2 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {body || 'Message body…'}
              </p>
            </div>
          </section>

          <CollapsibleOnMobile
            narrow={narrow}
            icon={BarChart3}
            title="Scheduling & delivery"
            subtitle="Queue · test send"
            defaultOpenMobile={false}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs space-y-1 block" style={{ color: 'var(--text-muted)' }}>
                Schedule at (local)
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="w-full rounded-xl border px-3 py-3 sm:py-2 text-sm min-h-[48px]"
                  style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                />
              </label>
              <label className="flex items-center gap-3 text-xs min-h-[48px] sm:mt-6" style={{ color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="h-5 w-5 accent-[var(--brand-primary)]"
                />
                Repeat broadcast
              </label>
              <label className="text-xs space-y-1 block sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
                Test email
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="flex-1 rounded-xl border px-3 py-3 sm:py-2 text-base sm:text-sm min-h-[48px]"
                    style={{ borderColor: 'var(--border-input)', background: 'var(--bg-input)', color: 'var(--input-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendTest()}
                    className="rounded-xl border px-5 py-3 text-sm font-bold min-h-[48px] shrink-0"
                    style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}
                  >
                    Send test
                  </button>
                </div>
              </label>
            </div>
          </CollapsibleOnMobile>

          <CollapsibleOnMobile
            narrow={narrow}
            icon={History}
            title="Notification history"
            subtitle="Last sends"
            defaultOpenMobile={false}
          >
            <div className="max-h-[200px] overflow-y-auto text-xs font-mono space-y-2 pr-1">
              {logs.slice(0, 12).map((log: any) => (
                <div
                  key={log.id || log._id}
                  className="rounded-lg border px-2 py-2"
                  style={{ borderColor: 'var(--divider)', background: 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{log.type}</span> · {log.subject?.slice(0, 48)}
                </div>
              ))}
              {!logs.length && <p style={{ color: 'var(--text-muted)' }}>No recent logs.</p>}
            </div>
            <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Scheduled jobs: {scheduled.length}
            </div>
          </CollapsibleOnMobile>

          <CollapsibleOnMobile narrow={narrow} icon={Save} title="Drafts & versions" subtitle="Local snapshots" defaultOpenMobile={false}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={duplicateCampaign}
                className="rounded-xl border px-4 py-2.5 text-xs font-bold min-h-[44px]"
                style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
              >
                Duplicate campaign
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-2 text-xs">
              {drafts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => restoreDraft(d)}
                  className="w-full text-left rounded-xl border px-3 py-2.5 min-h-[44px] active:scale-[0.99] transition-transform"
                  style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
                >
                  {new Date(d.at).toLocaleString()} · {d.channel} · {d.subject.slice(0, 40)}
                </button>
              ))}
              {!drafts.length && <p style={{ color: 'var(--text-muted)' }}>Save drafts from the AI panel.</p>}
            </div>
          </CollapsibleOnMobile>
        </div>

        {/* Right AI — desktop */}
        <div className="hidden lg:block lg:sticky lg:top-4 space-y-4">{renderAiPanel(false)}</div>
      </div>

      {/* Sticky toolbar — thumb zone + safe area */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[80] border-t lg:hidden"
        style={{
          borderColor: 'color-mix(in srgb, var(--brand-primary) 25%, var(--border-card))',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
          backdropFilter: 'blur(16px) saturate(1.2)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -12px 40px -16px color-mix(in srgb, var(--brand-primary) 18%, transparent)',
        }}
      >
        <div className="flex overflow-x-auto ns-hide-scrollbar gap-2 px-3 pt-3 pb-1 justify-center sm:flex-wrap sm:overflow-visible max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => void sendNow()}
            disabled={aiBusy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 sm:px-6 py-3 text-sm font-bold text-[var(--text-on-accent)] min-h-[48px] shrink-0 sm:flex-1 sm:max-w-[200px]"
            style={{
              background: 'var(--gradient-brand-cta)',
              boxShadow: '0 0 28px color-mix(in srgb, var(--brand-primary) 40%, transparent), var(--shadow-cta)',
            }}
          >
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
          <button
            type="button"
            onClick={() => void scheduleSend()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold min-h-[48px] shrink-0 sm:flex-1 sm:max-w-[200px]"
            style={{
              borderColor: 'var(--brand-border-subtle)',
              background: 'var(--brand-tint)',
              color: 'var(--text-primary)',
            }}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={pushDraft}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold min-h-[48px] shrink-0 lg:hidden"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
          >
            <Save className="h-4 w-4" /> Draft
          </button>
        </div>
      </div>

      {/* Mobile AI FAB — single assistant on admin (global AssistantChat hidden on /admin) */}
      <button
        type="button"
        className="ns-ai-commerce lg:hidden fixed z-[85] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl text-[var(--text-on-accent)] touch-manipulation active:scale-95 transition-transform"
        style={{
          right: 'max(1rem, env(safe-area-inset-right, 0px))',
          bottom: 'calc(5.75rem + env(safe-area-inset-bottom, 0px))',
          background: 'var(--gradient-brand-cta)',
          boxShadow:
            '0 0 0 1px color-mix(in srgb, var(--text-on-accent) 25%, transparent), 0 12px 40px color-mix(in srgb, var(--brand-primary) 50%, transparent)',
        }}
        onClick={() => setMobileAiOpen(true)}
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-7 w-7" />
      </button>

      <AnimatePresence>
        {mobileAiOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[95] flex flex-col justify-end"
            style={{ background: 'color-mix(in srgb, var(--bg-page) 45%, rgba(0,0,0,0.55))' }}
            onClick={() => setMobileAiOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="ns-ai-commerce max-h-[min(92dvh,900px)] overflow-y-auto rounded-t-[1.75rem] border-t px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
              style={{
                background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, var(--border-card))',
                boxShadow: '0 -20px 60px -20px color-mix(in srgb, var(--brand-primary) 25%, transparent)',
                backdropFilter: 'blur(20px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full" style={{ background: 'var(--divider)' }} aria-hidden />
              <div className="flex justify-between items-center mb-3 gap-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--brand-primary)' }}>
                    Assistant
                  </p>
                  <span className="font-bold text-base">Neural copy</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileAiOpen(false)}
                  className="rounded-xl border p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  style={{ borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderAiPanel(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <AnimatePresence>
        {compareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'color-mix(in srgb, var(--bg-page) 20%, rgba(0,0,0,0.6))' }}
            onClick={() => setCompareOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="ns-card max-w-3xl w-full sm:rounded-2xl border border-t sm:border-t p-4 sm:p-5 space-y-4 max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
              style={{
                background: 'var(--modal-bg)',
                borderColor: 'color-mix(in srgb, var(--brand-primary) 28%, var(--modal-border))',
                boxShadow: '0 -8px 48px color-mix(in srgb, var(--brand-primary) 15%, transparent)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg tracking-tight">Compare versions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Before
                  </p>
                  <pre
                    className="rounded-xl border p-3 max-h-[min(40vh,220px)] md:max-h-[200px] overflow-auto whitespace-pre-wrap text-xs sm:text-sm"
                    style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                  >
                    {comparePrev}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    AI output
                  </p>
                  <pre
                    className="rounded-xl border p-3 max-h-[min(40vh,220px)] md:max-h-[200px] overflow-auto whitespace-pre-wrap text-xs sm:text-sm"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--brand-primary) 25%, var(--divider))',
                      background: 'color-mix(in srgb, var(--bg-secondary) 85%, var(--brand-tint))',
                    }}
                  >
                    {aiText}
                  </pre>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                className="w-full sm:w-auto rounded-xl border px-4 py-3 text-sm font-bold min-h-[48px]"
                style={{ borderColor: 'var(--border-card)' }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
