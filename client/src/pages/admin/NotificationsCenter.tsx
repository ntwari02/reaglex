import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, History, Sparkles, Mail, Bell, MessageSquare, Smartphone, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuthStore } from '@/stores/authStore';
import { ChannelTabs } from '@/components/notifications/ChannelTabs';
import { ComposerCard } from '@/components/notifications/ComposerCard';
import { AICopilotPanel } from '@/components/notifications/AICopilotPanel';
import { NotificationHistoryDrawer } from '@/components/notifications/NotificationHistoryDrawer';
import { TemplateLibraryModal } from '@/components/notifications/TemplateLibraryModal';
import { SendConfirmationModal } from '@/components/notifications/SendConfirmationModal';
import { SchedulePickerPopover } from '@/components/notifications/SchedulePickerPopover';
import { ToastNotification } from '@/components/notifications/ToastNotification';
import type {
  ChannelTabDefinition,
  NotificationChannel,
  NotificationHistoryItem,
  NotificationTemplate,
  ReadabilityResult,
  Recipient,
  TemplateCategory,
  ToastState,
} from '@/components/notifications/types';

const NOTIFICATIONS_API = `${API_BASE_URL}/admin/notifications`;
const DRAFT_KEY = 'reaglex_admin_notifications_center_v2';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function mapChannel(channel: NotificationChannel): string {
  if (channel === 'in-app') return 'inapp';
  if (channel === 'system-alert') return 'system';
  return channel;
}

export default function NotificationsCenter() {
  const adminUser = useAuthStore((s) => s.user);
  const fromEmail = adminUser?.email || 'coderangers02@gmail.com';

  const [activeChannel, setActiveChannel] = useState<NotificationChannel>('email');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<Recipient[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [targetGroup, setTargetGroup] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const [readabilityOpen, setReadabilityOpen] = useState(false);
  const [readabilityResult, setReadabilityResult] = useState<ReadabilityResult | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [aiOpen, setAiOpen] = useState(() => window.innerWidth > 1280);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('Professional');
  const [aiLanguage, setAiLanguage] = useState('EN');
  const [aiGenerated, setAiGenerated] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'email' | 'desktop' | 'mobile' | 'dark' | 'push'>('email');
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceChat, setWorkspaceChat] = useState<Array<{ id: number; role: 'user' | 'assistant'; text: string }>>([]);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'All' | TemplateCategory>('All');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<NotificationHistoryItem[]>([]);

  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [timezone, setTimezone] = useState('Africa/Kigali');
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<'once' | 'daily' | 'weekly'>('once');
  const [is24Hour, setIs24Hour] = useState(true);

  const isMobile = useMemo(() => window.innerWidth < 768, []);
  const isTablet = useMemo(() => window.innerWidth >= 768 && window.innerWidth < 1024, []);
  const aiBottomDrawer = isTablet || isMobile;

  const channelTabs: ChannelTabDefinition[] = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'in-app', label: 'In-App', icon: Bell },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'push', label: 'Push', icon: Smartphone },
    { id: 'system-alert', label: 'System Alert', icon: AlertTriangle },
  ];

  const recipientPreview = useMemo(() => ['AL', 'SM', 'JR', 'KD', 'NP'], []);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ id: Date.now(), message, type });
    if (type === 'success') {
      window.setTimeout(() => setToast(null), 4000);
    }
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const byCategory = templateCategory === 'All' || template.category === templateCategory;
      const byQuery =
        !templateQuery.trim() ||
        template.name.toLowerCase().includes(templateQuery.toLowerCase()) ||
        template.snippet.toLowerCase().includes(templateQuery.toLowerCase());
      return byCategory && byQuery;
    });
  }, [templates, templateCategory, templateQuery]);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      setSubject(draft.subject || '');
      setBody(draft.body || '');
      setRecipients(Array.isArray(draft.recipients) ? draft.recipients : []);
      setTargetGroup(draft.targetGroup || '');
      setActiveChannel(draft.activeChannel || 'email');
    } catch {
      // ignore invalid drafts
    }
  }, []);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const id = window.setTimeout(() => {
      setIsSaving(true);
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ subject, body, recipients, targetGroup, activeChannel })
      );
      window.setTimeout(() => setIsSaving(false), 450);
    }, 600);
    return () => window.clearTimeout(id);
  }, [subject, body, recipients, targetGroup, activeChannel, autoSaveEnabled]);

  useEffect(() => {
    if (!targetGroup) return;
    const run = async () => {
      try {
        const response = await fetch(
          `${NOTIFICATIONS_API}/recipient-count?targetGroup=${encodeURIComponent(targetGroup)}`,
          { headers: authHeaders(), credentials: 'include' }
        );
        const data = await response.json().catch(() => ({}));
        if (typeof data.count === 'number') setRecipientCount(data.count);
      } catch {
        setRecipientCount(0);
      }
    };
    void run();
  }, [targetGroup]);

  useEffect(() => {
    if (toQuery.trim().length < 2 || targetGroup) {
      setUserSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${NOTIFICATIONS_API}/user-search?q=${encodeURIComponent(toQuery.trim())}`,
          { headers: authHeaders(), credentials: 'include' }
        );
        const data = await response.json().catch(() => ({}));
        if (Array.isArray(data.users)) setUserSuggestions(data.users);
      } catch {
        setUserSuggestions([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [toQuery, targetGroup]);

  useEffect(() => {
    if (!historyOpen) return;
    const run = async () => {
      try {
        const response = await fetch(`${NOTIFICATIONS_API}/history?limit=20`, {
          headers: authHeaders(),
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));
        if (Array.isArray(data.history)) setHistoryItems(data.history);
      } catch {
        setHistoryItems([]);
      }
    };
    void run();
  }, [historyOpen]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/templates`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!Array.isArray(data.templates)) return;
      setTemplates(
        data.templates.map((item: any) => ({
          id: String(item.id),
          name: item.name || 'Untitled template',
          snippet: String(item.content || '').slice(0, 120),
          subject: item.subject || '',
          content: item.content || '',
          type: item.type || 'email',
          category: (item.category as TemplateCategory) || 'Promo',
          updatedAt: item.updatedAt,
        }))
      );
    } catch {
      showToast('Could not load templates', 'error');
    }
  }, [showToast]);

  const runReadability = useCallback(() => {
    const words = body.trim().split(/\s+/).filter(Boolean);
    const minutes = Math.max(1, Math.ceil(words.length / 200));
    const warnings = ['free', 'urgent', 'guaranteed', 'winner', 'risk-free'].filter((w) =>
      body.toLowerCase().includes(w)
    );
    setReadabilityResult({
      fleschScore: Math.max(20, Math.min(96, 88 - Math.floor(words.length / 35))),
      sentiment: body.includes('!') ? 'positive' : 'neutral',
      estimatedReadMinutes: minutes,
      spamWarnings: warnings,
    });
    setReadabilityOpen(true);
  }, [body]);

  const handleGenerateAI = useCallback(async () => {
    setAiGenerating(true);
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/generate-ai`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetGroup || 'Custom segment',
          notificationType: activeChannel,
          tone: aiTone.toLowerCase(),
          context: `${aiPrompt}\nPreferred language: ${aiLanguage}`,
          existingSubject: subject,
          existingBody: body,
          eventTrigger: 'Campaign update',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'AI generation failed');
      const generatedBody = String(data.bodies?.[0]?.text || data.body || '');
      const generatedSubject = String(data.subjects?.[0]?.text || data.subject || '');
      setAiGenerated(generatedBody);
      if (!subject && generatedSubject) setSubject(generatedSubject);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI generation failed', 'error');
    } finally {
      setAiGenerating(false);
    }
  }, [targetGroup, activeChannel, aiTone, aiPrompt, aiLanguage, subject, body, showToast]);

  const handleSendNow = useCallback(async () => {
    const specificEmails = recipients.map((recipient) => recipient.email);
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/send`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetGroup || undefined,
          specificEmails,
          notificationType: mapChannel(activeChannel),
          subject,
          body,
          scheduledAt: null,
          isTestSend: false,
          testEmail: '',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Send failed');
      setSendSuccess(true);
      showToast(data.message || 'Notification sent successfully', 'success');
      setTimeout(() => {
        setSendConfirmOpen(false);
        setSendSuccess(false);
      }, 1100);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Send failed', 'error');
    }
  }, [activeChannel, body, recipients, showToast, subject, targetGroup]);

  const handleSchedule = useCallback(async () => {
    if (!scheduleDate || !scheduleTime) {
      showToast('Pick a schedule date and time first', 'error');
      return;
    }
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      await fetch(`${NOTIFICATIONS_API}/send`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetGroup || undefined,
          specificEmails: recipients.map((r) => r.email),
          notificationType: mapChannel(activeChannel),
          subject,
          body,
          scheduledAt,
          repeatEnabled,
          repeatFrequency,
          timezone,
          isTestSend: false,
          testEmail: '',
        }),
      });
      showToast('Campaign scheduled successfully', 'success');
      setScheduleOpen(false);
    } catch {
      showToast('Scheduling failed', 'error');
    }
  }, [scheduleDate, scheduleTime, targetGroup, recipients, activeChannel, subject, body, repeatEnabled, repeatFrequency, timezone, showToast]);

  return (
    <div
      className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]"
      style={
        {
          '--bg-base': '#0a0b0f',
          '--bg-surface': '#10131a',
          '--bg-elevated': '#161b26',
          '--bg-glass': 'rgba(255,255,255,0.04)',
          '--border': 'rgba(255,255,255,0.07)',
          '--border-active': 'rgba(16,185,129,0.5)',
          '--accent': '#10b981',
          '--accent-dim': '#065f46',
          '--accent-glow': 'rgba(16,185,129,0.15)',
          '--text-primary': '#f0f4f8',
          '--text-secondary': '#8b97a8',
          '--text-muted': '#4a5568',
          '--danger': '#ef4444',
          '--warning': '#f59e0b',
          '--info': '#3b82f6',
        } as CSSProperties
      }
    >
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Admin &gt; Notifications</p>
            <h1 className="font-['Syne'] text-[28px] font-semibold leading-tight">Notifications Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
              Compose and send campaigns across email, in-app, SMS, push, and system alerts
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> New Campaign
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]"
            >
              <History className="h-4 w-4" /> Notification History
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-glass)] px-3 py-2 text-sm text-[var(--text-secondary)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent)]" /> AI Workspace
            </button>
            {!isMobile ? (
              <>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">Sent today: 142</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">Open rate: 68%</span>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">Queued: 3</span>
              </>
            ) : null}
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
        <ChannelTabs
          tabs={channelTabs}
          activeTab={activeChannel}
          onChange={setActiveChannel}
          autoSaveEnabled={autoSaveEnabled}
          isSaving={isSaving}
          onToggleAutoSave={() => setAutoSaveEnabled((v) => !v)}
          onScheduleClick={() => setScheduleOpen(true)}
        />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="flex gap-4">
        <div className="min-w-0 flex-1">
          <ComposerCard
            fromEmail={fromEmail}
            recipients={recipients}
            toQuery={toQuery}
            onToQueryChange={setToQuery}
            userSuggestions={userSuggestions}
            onAddRecipient={(recipient) => {
              setTargetGroup('');
              setRecipients((prev) =>
                prev.some((item) => item.email.toLowerCase() === recipient.email.toLowerCase())
                  ? prev
                  : [...prev, recipient]
              );
              setToQuery('');
              setUserSuggestions([]);
            }}
            onRemoveRecipient={(email) =>
              setRecipients((prev) => prev.filter((recipient) => recipient.email !== email))
            }
            onAddCcToggle={() => setShowCc((v) => !v)}
            onAddBccToggle={() => setShowBcc((v) => !v)}
            showCc={showCc}
            showBcc={showBcc}
            cc={cc}
            bcc={bcc}
            onCcChange={setCc}
            onBccChange={setBcc}
            targetGroup={targetGroup}
            onSelectTargetGroup={(group) => {
              setTargetGroup(group);
              setRecipients([]);
              setToQuery('');
            }}
            recipientCount={recipientCount}
            recipientPreview={recipientPreview}
            onRemoveGroup={() => setTargetGroup('')}
            onLoadTemplate={() => {
              void loadTemplates();
              setTemplateOpen(true);
            }}
            onSaveTemplate={() => setTemplateOpen(true)}
            onRephrase={handleGenerateAI}
            onAnalyze={runReadability}
            onInsertVariable={() => setBody((prev) => `${prev} {{user_name}}`)}
            subject={subject}
            onSubjectChange={setSubject}
            body={body}
            onBodyChange={setBody}
            markdownPreview={markdownPreview}
            onTogglePreview={() => setMarkdownPreview((v) => !v)}
            readabilityOpen={readabilityOpen}
            readabilityResult={readabilityResult}
            onSaveDraft={() => {
              localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, body, recipients, targetGroup, activeChannel }));
              showToast('Draft saved', 'success');
            }}
            onSchedule={() => setScheduleOpen(true)}
            onSend={() => setSendConfirmOpen(true)}
          />
        </div>

        {!aiBottomDrawer ? (
          <AICopilotPanel
            open={aiOpen}
            bottomDrawer={false}
            prompt={aiPrompt}
            setPrompt={setAiPrompt}
            tone={aiTone}
            setTone={setAiTone}
            language={aiLanguage}
            setLanguage={setAiLanguage}
            generated={aiGenerated}
            generating={aiGenerating}
            compareMode={compareMode}
            onToggleCompare={() => setCompareMode((v) => !v)}
            onGenerate={handleGenerateAI}
            onCollapse={() => setAiOpen(false)}
            onSendToEditor={() => setBody(aiGenerated || body)}
            onSaveDraft={() => {
              localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, body, recipients, targetGroup, activeChannel }));
              showToast('Draft saved', 'success');
            }}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            subject={subject}
            body={body}
            slashCommands={['/promo', '/refund', '/shipping', '/dispute', '/seller-warning', '/welcome', '/update']}
            onApplyCommand={(cmd) => setAiPrompt(cmd)}
          />
        ) : null}
      </motion.section>

      {aiBottomDrawer ? (
        <>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_10px_26px_var(--accent-glow)]"
            aria-label="Open AI Copilot"
          >
            ✦
          </button>
          <AICopilotPanel
            open={aiOpen}
            bottomDrawer
            prompt={aiPrompt}
            setPrompt={setAiPrompt}
            tone={aiTone}
            setTone={setAiTone}
            language={aiLanguage}
            setLanguage={setAiLanguage}
            generated={aiGenerated}
            generating={aiGenerating}
            compareMode={compareMode}
            onToggleCompare={() => setCompareMode((v) => !v)}
            onGenerate={handleGenerateAI}
            onCollapse={() => setAiOpen(false)}
            onSendToEditor={() => setBody(aiGenerated || body)}
            onSaveDraft={() => showToast('Draft saved', 'success')}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            subject={subject}
            body={body}
            slashCommands={['/promo', '/refund', '/shipping', '/dispute', '/seller-warning', '/welcome', '/update']}
            onApplyCommand={(cmd) => setAiPrompt(cmd)}
          />
        </>
      ) : null}

      {!aiOpen && !aiBottomDrawer ? (
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-lg border border-r-0 border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-4 text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]"
        >
          ✦ AI Copilot
        </button>
      ) : null}

      <SchedulePickerPopover
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        date={scheduleDate}
        time={scheduleTime}
        timezone={timezone}
        repeatEnabled={repeatEnabled}
        repeatFrequency={repeatFrequency}
        is24Hour={is24Hour}
        onChange={(next) => {
          if (next.date !== undefined) setScheduleDate(next.date);
          if (next.time !== undefined) setScheduleTime(next.time);
          if (next.timezone !== undefined) setTimezone(next.timezone);
          if (next.repeatEnabled !== undefined) setRepeatEnabled(next.repeatEnabled);
          if (next.repeatFrequency !== undefined) setRepeatFrequency(next.repeatFrequency);
          if (next.is24Hour !== undefined) setIs24Hour(next.is24Hour);
        }}
        onConfirm={() => void handleSchedule()}
      />

      <NotificationHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        items={historyItems}
        onLoad={(item) => {
          setSubject(item.subject);
          setBody(item.body);
          setActiveChannel(item.channel);
          setRecipientCount(item.recipientCount);
          setHistoryOpen(false);
          showToast('Loaded from history', 'success');
        }}
      />

      <TemplateLibraryModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        templates={filteredTemplates}
        query={templateQuery}
        category={templateCategory}
        onQueryChange={setTemplateQuery}
        onCategoryChange={setTemplateCategory}
        onUseTemplate={(template) => {
          setSubject(template.subject || '');
          setBody(template.content || '');
          setTemplateOpen(false);
          showToast('Template applied', 'success');
        }}
      />

      <SendConfirmationModal
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        channel={activeChannel}
        recipientCount={recipientCount || recipients.length}
        subject={subject}
        estimatedDelivery="~45 seconds"
        sentSuccess={sendSuccess}
        onConfirm={() => void handleSendNow()}
      />

      <Dialog.Root open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-3 z-[110] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="font-['Syne'] text-xl text-[var(--text-primary)]">AI Workspace</Dialog.Title>
            </div>
            <div className="grid h-[calc(100%-3rem)] grid-rows-[1fr,auto] gap-3">
              <div className="space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
                {workspaceChat.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">Start a campaign conversation with AI.</p>
                ) : (
                  workspaceChat.map((item) => (
                    <div key={item.id} className={`rounded-lg p-2 text-sm ${item.role === 'user' ? 'bg-[var(--accent)]/20' : 'bg-white/5'}`}>
                      <p className="text-[var(--text-primary)]">{item.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask AI for subject lines, CTAs, rewrites..."
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!aiPrompt.trim()) return;
                    const userMessage = { id: Date.now(), role: 'user' as const, text: aiPrompt };
                    setWorkspaceChat((prev) => [...prev, userMessage]);
                    await handleGenerateAI();
                    setWorkspaceChat((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: aiGenerated || 'Generated a campaign rewrite for you.' }]);
                    setAiPrompt('');
                  }}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Send
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
