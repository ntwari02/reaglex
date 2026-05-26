import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BookOpen,
  ChevronDown,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { AlertRow } from '@/stores/systemAnalysisUiStore';

export interface MonitorNotificationSettings {
  emails: string[];
  phones: string[];
  slackWebhookUrl: string;
  notifyOnCritical: boolean;
  notifyOnWarning: boolean;
  cooldownMinutes: number;
}

export interface MonitorSettingsFull {
  monitoringEnabled: boolean;
  cpuWarn: number;
  cpuCritical: number;
  apiSlowWarnMs?: number;
  apiSlowCriticalMs?: number;
  sensitivity: string;
  notifications?: MonitorNotificationSettings;
}

export interface GuideSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
}

export interface AlertDiagnosis {
  summary: string;
  likelyCause: string;
  impact: string;
  fixes: string[];
  urgency: 'low' | 'medium' | 'high';
  source: 'ai' | 'rules';
}

type Props = {
  settings: MonitorSettingsFull | null;
  alerts: AlertRow[];
  authHeaders: () => Record<string, string>;
  onSettingsSaved?: () => void;
  compact?: boolean;
};

export default function SystemOpsCenterPanel({
  settings,
  alerts,
  authHeaders,
  onSettingsSaved,
  compact = false,
}: Props) {
  const [guideOpen, setGuideOpen] = useState(!compact);
  const [contactsOpen, setContactsOpen] = useState(true);
  const [guide, setGuide] = useState<GuideSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [diagnosingId, setDiagnosingId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<AlertDiagnosis | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);

  const n = settings?.notifications;
  const [emails, setEmails] = useState('');
  const [phones, setPhones] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [notifyOnCritical, setNotifyOnCritical] = useState(true);
  const [notifyOnWarning, setNotifyOnWarning] = useState(true);
  const [cooldownMinutes, setCooldownMinutes] = useState(30);

  useEffect(() => {
    setEmails((n?.emails || []).join(', '));
    setPhones((n?.phones || []).join(', '));
    setSlackWebhookUrl(n?.slackWebhookUrl || '');
    setNotifyOnCritical(n?.notifyOnCritical !== false);
    setNotifyOnWarning(n?.notifyOnWarning !== false);
    setCooldownMinutes(n?.cooldownMinutes ?? 30);
  }, [n]);

  useEffect(() => {
    void fetch(`${API_BASE_URL}/system/guide`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setGuide(data.sections || []))
      .catch(() => setGuide([]));
  }, [authHeaders]);

  const saveContacts = useCallback(async () => {
    setSaving(true);
    setTestMsg(null);
    try {
      await fetch(`${API_BASE_URL}/system/settings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          monitoringEnabled: settings?.monitoringEnabled ?? true,
          cpuWarn: settings?.cpuWarn,
          cpuCritical: settings?.cpuCritical,
          apiSlowWarnMs: settings?.apiSlowWarnMs,
          apiSlowCriticalMs: settings?.apiSlowCriticalMs,
          sensitivity: settings?.sensitivity,
          notifications: {
            emails: emails.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean),
            phones: phones.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean),
            slackWebhookUrl: slackWebhookUrl.trim(),
            notifyOnCritical,
            notifyOnWarning,
            cooldownMinutes: Number(cooldownMinutes) || 30,
          },
        }),
      });
      setTestMsg('Notification settings saved.');
      onSettingsSaved?.();
    } finally {
      setSaving(false);
    }
  }, [
    authHeaders,
    emails,
    phones,
    slackWebhookUrl,
    notifyOnCritical,
    notifyOnWarning,
    cooldownMinutes,
    settings,
    onSettingsSaved,
  ]);

  const sendTest = async () => {
    const first = emails.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean)[0];
    if (!first) {
      setTestMsg('Add at least one email first.');
      return;
    }
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await fetch(`${API_BASE_URL}/system/notifications/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: first }),
      });
      const data = await r.json();
      setTestMsg(data.message || (data.ok ? 'Sent' : 'Failed'));
    } finally {
      setTesting(false);
    }
  };

  const runDiagnosis = async (alert: AlertRow) => {
    setSelectedAlert(alert);
    setDiagnosingId(alert.id);
    setDiagnosis(null);
    try {
      const r = await fetch(`${API_BASE_URL}/system/alerts/explain`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ alert }),
      });
      const data = await r.json();
      setDiagnosis(data.diagnosis || null);
    } catch {
      setDiagnosis(null);
    } finally {
      setDiagnosingId(null);
    }
  };

  const actionableAlerts = alerts.filter((a) => a.id !== 'a-ok');

  return (
    <div
      className={cn('rounded-2xl border mb-6 overflow-hidden', compact && 'mb-4')}
      style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-card)' }}
      >
        <Bell className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ops center — how it works &amp; alerts
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Configure who gets emailed when the site has problems. AI explains cause and fixes.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 text-left min-h-[44px] rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
          onClick={() => setGuideOpen((o) => !o)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            How monitoring works
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', guideOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {guide.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: 'var(--border-card)', background: 'var(--bg-page)' }}
                >
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {section.title}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {section.summary}
                  </p>
                  <ul className="mt-2 list-disc pl-4 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 text-left min-h-[44px] rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
          onClick={() => setContactsOpen((o) => !o)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Mail className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            Alert contacts
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', contactsOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {contactsOpen && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveContacts();
              }}
            >
              <label className="block text-xs md:col-span-2" style={{ color: 'var(--text-secondary)' }}>
                Admin emails (comma-separated)
                <input
                  type="text"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="ops@company.com, admin@company.com"
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
              </label>
              <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone (on-call list)
                </span>
                <input
                  type="text"
                  value={phones}
                  onChange={(e) => setPhones(e.target.value)}
                  placeholder="+250..., +1..."
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
                <span className="text-[10px] mt-1 block opacity-80">SMS needs Twilio; numbers appear in Slack note.</span>
              </label>
              <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Slack webhook (optional)
                </span>
                <input
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="mt-1 w-full rounded-lg border px-3 py-2.5 min-h-[48px] text-sm"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <label className="flex items-center gap-2 min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={notifyOnCritical}
                    onChange={(e) => setNotifyOnCritical(e.target.checked)}
                  />
                  Email on critical
                </label>
                <label className="flex items-center gap-2 min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={notifyOnWarning}
                    onChange={(e) => setNotifyOnWarning(e.target.checked)}
                  />
                  Email on warning
                </label>
                <label className="flex items-center gap-2">
                  Cooldown (min)
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={cooldownMinutes}
                    onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                    className="w-20 rounded-lg border px-2 py-1 min-h-[40px]"
                    style={{
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border-input)',
                      color: 'var(--input-text)',
                    }}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Save contacts
                </button>
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => void sendTest()}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl text-sm font-medium border"
                  style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Test email
                </button>
              </div>
              {testMsg && (
                <p className="text-xs md:col-span-2" style={{ color: 'var(--text-muted)' }}>
                  {testMsg}
                </p>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {actionableAlerts.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              Diagnose active alerts
            </p>
            <div className="flex flex-wrap gap-2">
              {actionableAlerts.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => void runDiagnosis(a)}
                  className={cn(
                    'text-xs px-3 py-2 rounded-lg border min-h-[40px] max-w-full text-left',
                    a.level === 'critical' && 'border-red-500/50',
                    a.level === 'warning' && 'border-amber-500/50',
                  )}
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-card)' }}
                >
                  {diagnosingId === a.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                  ) : null}
                  {a.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {(diagnosis || diagnosingId) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border p-4 text-sm space-y-3"
              style={{ borderColor: 'var(--brand-border-subtle)', background: 'var(--bg-page)' }}
            >
              {diagnosingId && !diagnosis && (
                <p className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
                </p>
              )}
              {selectedAlert && (
                <p className="font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {selectedAlert.title}
                </p>
              )}
              {diagnosis && (
                <>
                  <p style={{ color: 'var(--text-primary)' }}>{diagnosis.summary}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                        Likely cause
                      </p>
                      <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {diagnosis.likelyCause}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                        Impact
                      </p>
                      <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {diagnosis.impact}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                      Suggested fixes ({diagnosis.source === 'ai' ? 'AI' : 'rules'})
                    </p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {diagnosis.fixes.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
