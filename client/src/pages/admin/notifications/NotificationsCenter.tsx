import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/config';
import { AiAssistantPanel } from './ai/AiAssistantPanel';

const NOTIFICATIONS_API = `${API_BASE_URL}/admin/notifications`;
const DRAFT_KEY = 'reaglex_admin_notification_composer_draft';

const EVENTS = [
  'Order placed',
  'Order shipped',
  'Order delivered',
  'Payment received',
  'New user registered',
  'Seller approved',
  'Seller rejected',
  'Product approved',
  'Low stock alert',
  'Subscription expired',
  'Password reset',
];

function getJsonAuthHeaders(): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type NotifTab = 'email' | 'in-app' | 'sms' | 'push' | 'system-alert';

function mapTypeForTemplate(t: NotifTab): string {
  if (t === 'in-app') return 'inapp';
  if (t === 'system-alert') return 'inapp';
  return t;
}

function mapTypeForGenerateApi(t: NotifTab): string {
  if (t === 'in-app') return 'in-app';
  if (t === 'system-alert') return 'system alert';
  return t;
}

const pillBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: 'var(--btn-ghost-hover-bg)',
  border: '1px solid var(--border-visible)',
  color: 'var(--text-disabled)',
  fontSize: 12,
  padding: '5px 10px',
  borderRadius: 99,
  cursor: 'pointer',
};

export default function NotificationsCenter() {
  const adminUser = useAuthStore((s) => s.user);
  const fromEmail = adminUser?.email || 'reaglex0@gmail.com';

  const [notifType, setNotifType] = useState<NotifTab>('email');
  const [targetGroup, setTargetGroup] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [userPills, setUserPills] = useState<{ email: string; fullName?: string }[]>([]);
  const [toQuery, setToQuery] = useState('');
  const [userHits, setUserHits] = useState<{ email: string; fullName?: string }[]>([]);
  const [showUserDd, setShowUserDd] = useState(false);
  const [showTargetDd, setShowTargetDd] = useState(false);
  const targetDdRef = useRef<HTMLDivElement>(null);
  const toRowRef = useRef<HTMLDivElement>(null);

  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [tone, setTone] = useState('professional');
  const [eventTrigger, setEventTrigger] = useState('Order placed');
  const [eventSearch, setEventSearch] = useState('');

  const [aiContext, setAiContext] = useState('');
  const [nextSlotId, setNextSlotId] = useState(3);
  const [subjects, setSubjects] = useState<{ id: number; text: string }[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ]);
  const [bodies, setBodies] = useState<{ id: number; text: string }[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ]);
  const [selectedSubject, setSelectedSubject] = useState(1);
  const [selectedBody, setSelectedBody] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  const [aiWorkspaceMode, setAiWorkspaceMode] = useState(false);
  const [appliedBodyId, setAppliedBodyId] = useState<number | null>(null);
  const [expandedBodyId, setExpandedBodyId] = useState<number | null>(null);

  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; name: string; subject?: string; content: string; type: string; updatedAt?: string }[]
  >([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSaveTplModal, setShowSaveTplModal] = useState(false);
  const [newTplName, setNewTplName] = useState('');

  const [showVarDd, setShowVarDd] = useState(false);
  const varDdRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const targetLabelForAi = useMemo(() => {
    if (targetGroup === 'All Customers' && recipientCount != null) {
      return `All Customers (${recipientCount.toLocaleString()})`;
    }
    if (targetGroup === 'All Sellers' && recipientCount != null) {
      return `All Sellers (${recipientCount.toLocaleString()})`;
    }
    if (targetGroup) return targetGroup;
    if (userPills.length) return `Specific User (${userPills.map((p) => p.email).join(', ')})`;
    return 'Custom segment';
  }, [targetGroup, recipientCount, userPills]);

  const specificEmails = useMemo(() => {
    const fromPills = userPills.map((p) => p.email);
    const typed = toQuery
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes('@'));
    return [...new Set([...fromPills, ...typed])];
  }, [userPills, toQuery]);

  useEffect(() => {
    if (!targetGroup || (targetGroup !== 'All Customers' && targetGroup !== 'All Sellers')) {
      setRecipientCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${NOTIFICATIONS_API}/recipient-count?targetGroup=${encodeURIComponent(targetGroup)}`,
          { headers: getJsonAuthHeaders(), credentials: 'include' }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data.count === 'number') setRecipientCount(data.count);
      } catch {
        if (!cancelled) setRecipientCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetGroup]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (targetDdRef.current && !targetDdRef.current.contains(t) && toRowRef.current && !toRowRef.current.contains(t)) {
        setShowTargetDd(false);
      }
      if (varDdRef.current && !varDdRef.current.contains(t)) setShowVarDd(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!autoSave) return;
    const t = window.setInterval(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            notifType,
            targetGroup,
            userPills,
            subject,
            body,
            ccInput,
            bccInput,
            tone,
            eventTrigger,
            variantA,
            variantB,
          })
        );
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [autoSave, notifType, targetGroup, userPills, subject, body, ccInput, bccInput, tone, eventTrigger, variantA, variantB]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.notifType) setNotifType(d.notifType);
      if (d.targetGroup !== undefined) setTargetGroup(d.targetGroup);
      if (Array.isArray(d.userPills)) setUserPills(d.userPills);
      if (d.subject) setSubject(d.subject);
      if (d.body) setBody(d.body);
      if (d.ccInput) setCcInput(d.ccInput);
      if (d.bccInput) {
        setBccInput(d.bccInput);
        setShowBcc(true);
      }
      if (d.tone) setTone(d.tone);
      if (d.eventTrigger) setEventTrigger(d.eventTrigger);
      if (d.variantA) setVariantA(d.variantA);
      if (d.variantB) setVariantB(d.variantB);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (appliedBodyId == null) return;
    const t = window.setTimeout(() => setAppliedBodyId(null), 1500);
    return () => clearTimeout(t);
  }, [appliedBodyId]);

  useEffect(() => {
    const syncAiPanelForMobile = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      setIsMobileViewport(mobile);
      if (mobile) {
        setAiCollapsed(false);
      } else {
        setAiWorkspaceMode(false);
      }
    };
    syncAiPanelForMobile();
    window.addEventListener('resize', syncAiPanelForMobile);
    return () => window.removeEventListener('resize', syncAiPanelForMobile);
  }, []);

  const searchDebounce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (toQuery.trim().length < 2 || targetGroup) {
      setUserHits([]);
      return;
    }
    window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`${NOTIFICATIONS_API}/user-search?q=${encodeURIComponent(toQuery.trim())}`, {
          headers: getJsonAuthHeaders(),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        setUserHits(Array.isArray(data.users) ? data.users : []);
        setShowUserDd(true);
      } catch {
        setUserHits([]);
      }
    }, 280);
    return () => window.clearTimeout(searchDebounce.current);
  }, [toQuery, targetGroup]);

  const generateAI = async (contextOverride?: string) => {
    setAiLoading(true);
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/generate-ai`, {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetLabelForAi,
          notificationType: mapTypeForGenerateApi(notifType),
          tone,
          context: contextOverride ?? aiContext,
          existingSubject: subject,
          existingBody: body,
          eventTrigger,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { message?: string }).message || 'AI generation failed. Try again.', 'error');
        return;
      }
      if (data.subjects) setSubjects(data.subjects);
      if (data.bodies) setBodies(data.bodies);
      setSelectedSubject(1);
      setSelectedBody(1);
      if (data.subjects?.[0]?.text) setSubject(data.subjects[0].text);
      if (data.bodies?.[0]?.text) setBody(data.bodies[0].text);
    } catch {
      showToast('AI generation failed. Try again.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSend = async (isTest = false) => {
    if (!subject.trim()) return showToast('Subject is required', 'error');
    if (!body.trim()) return showToast('Message body is required', 'error');
    if (isTest) {
      const addr = (testEmail || fromEmail).trim();
      if (!addr) return showToast('Enter a test email address', 'error');
      setSending(true);
      try {
        const res = await fetch(`${NOTIFICATIONS_API}/send`, {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            targetGroup: targetGroup || undefined,
            specificEmails,
            notificationType: notifType === 'in-app' ? 'inapp' : notifType === 'system-alert' ? 'system' : notifType,
            subject,
            body,
            scheduledAt: null,
            isTestSend: true,
            testEmail: addr,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast((data as { message?: string }).message || 'Send failed', 'error');
          return;
        }
        showToast((data as { message?: string }).message || 'Test sent', 'success');
      } catch {
        showToast('Send failed.', 'error');
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/send`, {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetGroup || undefined,
          specificEmails,
          notificationType: notifType === 'in-app' ? 'inapp' : notifType === 'system-alert' ? 'system' : notifType,
          subject,
          body,
          scheduledAt: null,
          isTestSend: false,
          testEmail: '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { message?: string }).message || 'Send failed', 'error');
        return;
      }
      showToast((data as { message?: string }).message || 'Sent successfully', 'success');
    } catch {
      showToast('Send failed.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      return showToast('Pick a date and time', 'error');
    }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/send`, {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetGroup || undefined,
          specificEmails,
          notificationType: notifType === 'in-app' ? 'inapp' : notifType === 'system-alert' ? 'system' : notifType,
          subject,
          body,
          scheduledAt,
          isTestSend: false,
          testEmail: '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { message?: string }).message || 'Scheduling failed', 'error');
        return;
      }
      showToast((data as { message?: string }).message || 'Scheduled', 'success');
      setShowScheduleModal(false);
    } catch {
      showToast('Scheduling failed', 'error');
    }
  };

  const selectTargetGroup = (group: string) => {
    setTargetGroup(group);
    setUserPills([]);
    setToQuery('');
    setShowTargetDd(false);
  };

  const addUserPill = (u: { email: string; fullName?: string }) => {
    setTargetGroup('');
    setUserPills((prev) => {
      if (prev.some((p) => p.email.toLowerCase() === u.email.toLowerCase())) return prev;
      return [...prev, u];
    });
    setToQuery('');
    setShowUserDd(false);
  };

  const removeGroupPill = () => {
    setTargetGroup('');
    setRecipientCount(null);
  };

  const wrapSelection = (open: string, close: string) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = ta.value;
    const sel = v.slice(start, end);
    const next = v.slice(0, start) + open + sel + close + v.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + open.length + sel.length + close.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return EVENTS;
    return EVENTS.filter((e) => e.toLowerCase().includes(q));
  }, [eventSearch]);

  const openTemplatesModal = async () => {
    setShowTemplatesModal(true);
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/templates`, { headers: getJsonAuthHeaders(), credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setTemplates(data.templates || []);
    } catch {
      showToast('Could not load templates', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const saveNewTemplate = async () => {
    if (!newTplName.trim()) return showToast('Name your template', 'error');
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/templates`, {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: newTplName.trim(),
          subject,
          body,
          type: mapTypeForTemplate(notifType),
          tone,
          category: 'Composer',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { message?: string }).message || 'Save failed', 'error');
        return;
      }
      showToast('Template saved', 'success');
      setShowSaveTplModal(false);
      setNewTplName('');
    } catch {
      showToast('Save failed', 'error');
    }
  };

  const handleSaveDraft = useCallback(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          notifType,
          targetGroup,
          userPills,
          subject,
          body,
          ccInput,
          bccInput,
          tone,
          eventTrigger,
          variantA,
          variantB,
        })
      );
    } catch {
      // ignore
    }
    showToast('Draft saved', 'success');
  }, [notifType, targetGroup, userPills, subject, body, ccInput, bccInput, tone, eventTrigger, variantA, variantB, showToast]);

  const generateAiCopilot = useCallback(
    async ({ context, tone: aiTone, language, command }: { context: string; tone: string; language: string; command?: string }) => {
      const prompt = [context, command, `Preferred language: ${language}`].filter(Boolean).join('\n').trim();
      const res = await fetch(`${NOTIFICATIONS_API}/generate-ai`, {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          targetGroup: targetLabelForAi,
          notificationType: mapTypeForGenerateApi(notifType),
          tone: aiTone || tone,
          context: prompt,
          existingSubject: subject,
          existingBody: body,
          eventTrigger,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { message?: string }).message || 'AI generation failed.');
      return {
        subject: String(data.subjects?.[0]?.text || data.subject || subject || ''),
        body: String(data.bodies?.[0]?.text || data.body || body || ''),
      };
    },
    [targetLabelForAi, notifType, tone, subject, body, eventTrigger]
  );

  const smsLen = body.length;
  const smsColor = smsLen > 160 ? '#EF4444' : smsLen > 140 ? '#FB923C' : 'var(--text-muted)';

  const tabDefs: { id: NotifTab; label: string; icon: string }[] = [
    { id: 'email', label: 'Email', icon: '✉' },
    { id: 'in-app', label: 'In-App', icon: '🔔' },
    { id: 'sms', label: 'SMS', icon: '💬' },
    { id: 'push', label: 'Push', icon: '📲' },
    { id: 'system-alert', label: 'System Alert', icon: '⚠' },
  ];

  return (
    <div
      className="nc-root notifications-page-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        fontFamily: 'inherit',
        margin: 0,
        padding: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {toast && (
        <div
          role="status"
          className="nc-toast toast-notification"
          style={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
            right: 'max(16px, env(safe-area-inset-right, 0px))',
            left: 'auto',
            zIndex: 9999,
            maxWidth: 'min(420px, calc(100vw - 32px))',
            background: 'var(--modal-bg)',
            border: '1px solid var(--divider-strong)',
            borderLeft: toast.type === 'success' ? '3px solid #00BFA5' : '3px solid #EF4444',
            borderRadius: 12,
            padding: '14px 18px',
            color: 'var(--text-primary)',
            fontSize: 14,
            boxShadow: 'var(--shadow-modal)',
            animation: 'ncSlideIn 0.25s ease',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="nc-layout mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-5 min-h-0">
        <header className="nc-page-header shrink-0 space-y-1 px-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Notifications Center
          </h1>
          <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Compose and send campaigns across email, in-app, SMS, push, and system alerts. Use the composer below, then
            refine copy with the AI assistant.
          </p>
        </header>

        <div className="nc-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-white/[0.07] dark:bg-[var(--card-bg)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      {/* Top action bar */}
      <div
        className="nc-topbar top-action-bar"
        style={{
          flexShrink: 0,
          minHeight: 44,
          padding: '10px max(16px, env(safe-area-inset-left)) 10px max(16px, env(safe-area-inset-right))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          className="nc-tabs notification-type-tabs"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            paddingBottom: 2,
            maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
          }}
        >
          {tabDefs.map((t) => (
            <button
              key={t.id}
              type="button"
              title={`${t.label} notification`}
              aria-label={`${t.label} notification`}
              onClick={() => setNotifType(t.id)}
              className="nc-tab-btn tab-pill"
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                fontSize: 12,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: notifType === t.id ? '#00BFA5' : 'var(--border-visible)',
                background: notifType === t.id ? 'rgba(0,191,165,0.14)' : 'var(--bg-hover)',
                color: notifType === t.id ? '#00BFA5' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minHeight: 36,
                boxShadow: notifType === t.id ? '0 0 20px rgba(0,191,165,0.15)' : 'none',
                transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
              }}
            >
              <span aria-hidden>{t.icon}</span> <span className="nc-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="nc-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label className="auto-save-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto-save</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoSave}
              onClick={() => setAutoSave((v) => !v)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 99,
                border: 'none',
                background: autoSave ? '#00BFA5' : 'var(--divider-strong)',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: autoSave ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 150ms',
                }}
              />
            </button>
          </label>

          <button
            type="button"
            className="nc-btn-ghost schedule-btn"
            onClick={() => setShowScheduleModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              border: '1px solid var(--divider-strong)',
              background: 'var(--btn-ghost-hover-bg)',
              color: 'var(--text-disabled)',
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            Schedule
          </button>
          <button
            type="button"
            className="nc-btn-ghost"
            onClick={() => {
              setAiCollapsed(false);
              setAiWorkspaceMode((v) => (isMobileViewport ? !v : v));
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              border: '1px solid var(--divider-strong)',
              background: aiWorkspaceMode ? 'rgba(0,191,165,0.12)' : 'var(--btn-ghost-hover-bg)',
              color: aiWorkspaceMode ? '#00BFA5' : 'var(--text-disabled)',
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            {aiWorkspaceMode ? 'Back to Composer' : 'AI Workspace'}
          </button>

          <button
            type="button"
            className="nc-btn-ghost save-draft-btn"
            onClick={handleSaveDraft}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              border: '1px solid var(--divider-strong)',
              background: 'var(--btn-ghost-hover-bg)',
              color: 'var(--text-disabled)',
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v5h8" />
            </svg>
            Save as Draft
          </button>

          <button
            type="button"
            className="nc-btn-send send-now-btn"
            onClick={() => handleSend(false)}
            disabled={sending}
            onMouseEnter={(e) => {
              if (!sending) e.currentTarget.style.background = '#00A896';
            }}
            onMouseLeave={(e) => {
              if (!sending) e.currentTarget.style.background = '#00BFA5';
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: sending ? '#007A68' : '#00BFA5',
              color: 'white',
              cursor: sending ? 'not-allowed' : 'pointer',
              minHeight: 44,
              boxShadow: sending ? 'none' : '0 4px 24px rgba(0,191,165,0.35)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
            {sending ? 'Sending…' : 'Send Now'}
          </button>
        </div>
      </div>

      {/* Main row */}
      <div
        className={`nc-main two-panel-container${aiCollapsed ? ' nc-main--ai-collapsed' : ''}${aiWorkspaceMode ? ' nc-main--ai-workspace' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left composer */}
        <div
          className={`nc-left nc-composer-glow left-composer-panel${aiWorkspaceMode && isMobileViewport ? ' left-composer-panel--hidden-mobile' : ''}`}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: aiCollapsed ? 'none' : '1px solid var(--divider)',
            minHeight: 0,
          }}
        >
          {/* From */}
          <div
            className="nc-field-row composer-field-row"
            style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--divider)' }}
          >
            <div
              className="nc-field-label composer-field-label"
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 13,
                color: 'var(--text-muted)',
                fontWeight: 500,
                padding: '14px 16px',
              }}
            >
              From
            </div>
            <div
              className="nc-field-value composer-field-content"
              style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '14px 16px 14px 0' }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-disabled)' }}>
                Admin &lt;{fromEmail}&gt;
              </span>
            </div>
          </div>

          {/* To */}
          <div
            ref={toRowRef}
            className="nc-field-row nc-to-row composer-field-row"
            style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--divider)' }}
          >
            <div
              className="nc-field-label composer-field-label"
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 13,
                color: 'var(--text-muted)',
                fontWeight: 500,
                padding: '14px 16px',
              }}
            >
              To
            </div>
            <div
              className="nc-field-value nc-to-inputs composer-field-content"
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', minWidth: 0 }}
            >
              {targetGroup && (
                <span
                  style={{
                    background: 'rgba(0,191,165,0.1)',
                    border: '1px solid rgba(0,191,165,0.3)',
                    color: '#00BFA5',
                    borderRadius: 99,
                    padding: '2px 8px',
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {targetGroup === 'All Customers' && recipientCount != null
                    ? `All Customers (${recipientCount.toLocaleString()})`
                    : targetGroup === 'All Sellers' && recipientCount != null
                      ? `All Sellers (${recipientCount.toLocaleString()})`
                      : targetGroup}
                  <button type="button" onClick={removeGroupPill} style={{ background: 'none', border: 'none', color: '#00BFA5', cursor: 'pointer', padding: 0, fontSize: 14 }}>
                    ×
                  </button>
                </span>
              )}
              {userPills.map((p) => (
                <span
                  key={p.email}
                  style={{
                    background: 'rgba(0,191,165,0.1)',
                    border: '1px solid rgba(0,191,165,0.3)',
                    color: '#00BFA5',
                    borderRadius: 99,
                    padding: '2px 8px',
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {p.fullName ? `${p.fullName} ` : ''}
                  {p.email}
                  <button
                    type="button"
                    onClick={() => setUserPills((prev) => prev.filter((x) => x.email !== p.email))}
                    style={{ background: 'none', border: 'none', color: '#00BFA5', cursor: 'pointer', padding: 0, fontSize: 14 }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={toQuery}
                onChange={(e) => setToQuery(e.target.value)}
                onFocus={() => {
                  if (!targetGroup && toQuery.length >= 2) setShowUserDd(true);
                }}
                placeholder="Search users or select target group..."
                disabled={!!targetGroup}
                className="target-group-select"
                style={{
                  flex: 1,
                  minWidth: 120,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  padding: '6px 0',
                }}
              />
            </div>
            <div style={{ position: 'relative', flexShrink: 0, padding: '8px 12px 8px 0' }} ref={targetDdRef}>
              <button
                type="button"
                onClick={() => setShowTargetDd((v) => !v)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-visible)',
                  color: 'var(--text-disabled)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Target Group ▾
              </button>
              {showTargetDd && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 4,
                    minWidth: 200,
                    background: 'var(--modal-bg)',
                    border: '1px solid var(--border-visible)',
                    borderRadius: 8,
                    zIndex: 50,
                    boxShadow: 'var(--dropdown-shadow)',
                  }}
                >
                  {['All Customers', 'All Sellers', 'Specific User', 'Custom Segment'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => selectTargetGroup(g)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showUserDd && userHits.length > 0 && !targetGroup && (
            <div
              style={{
                marginLeft: 88,
                marginTop: -6,
                marginBottom: 8,
                maxWidth: 420,
                border: '1px solid var(--border-visible)',
                borderRadius: 8,
                background: 'var(--modal-bg)',
                zIndex: 40,
              }}
            >
              {userHits.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => addUserPill(u)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--divider)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{u.fullName || 'User'}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{u.email}</span>
                </button>
              ))}
            </div>
          )}

          {/* Cc */}
          <div
            className="nc-field-row composer-field-row"
            style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--divider)' }}
          >
            <div
              className="nc-field-label composer-field-label"
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 13,
                color: 'var(--text-muted)',
                fontWeight: 500,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Cc
              {!showBcc && (
                <button
                  type="button"
                  className="nc-bcc-link"
                  onClick={() => setShowBcc(true)}
                  style={{
                    fontSize: 11,
                    color: '#00BFA5',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 4px',
                    minHeight: 36,
                  }}
                >
                  Bcc
                </button>
              )}
            </div>
            <div className="nc-field-value nc-cc-input-wrap composer-field-content" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <input
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  padding: '14px 16px 14px 0',
                }}
              />
            </div>
          </div>

          {showBcc && (
            <div
              className="nc-field-row composer-field-row"
              style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--divider)' }}
            >
              <div
                className="nc-field-label composer-field-label"
                style={{
                  width: 72,
                  flexShrink: 0,
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  padding: '14px 16px',
                }}
              >
                Bcc
              </div>
              <div className="nc-field-value composer-field-content" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                <input
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    padding: '14px 16px 14px 0',
                  }}
                />
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div
            className="nc-composer-toolbar composer-toolbar-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              padding: '10px 16px',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            {(
              [
                ['📄', 'Load existing Templates', () => openTemplatesModal()],
                ['💾', 'Save as new template', () => setShowSaveTplModal(true)],
                ['✏️', 'Rephrase', () => generateAI('Rephrase this message to be clearer and more engaging')],
                ['📊', 'Analyze', () => showToast('Readability: good · CTA present · Links: optional', 'success')],
              ] as const
            ).map(([icon, label, fn]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                style={pillBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-active)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--btn-ghost-hover-bg)';
                  e.currentTarget.style.color = 'var(--text-disabled)';
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Subject */}
          <div className="nc-subject-block subject-field-wrapper">
            <div style={{ padding: '12px 16px 4px', fontSize: 13, color: 'var(--text-muted)' }}>Subject</div>
            <input
              className="nc-subject-input subject-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter notification subject..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--divider)',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 14,
                padding: '8px 16px',
              }}
            />
          </div>

          {/* Body area */}
          <div className="nc-body-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 200, minWidth: 0 }}>
            {notifType === 'email' && (
              <div
                className="nc-format-bar rich-text-toolbar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexWrap: 'wrap',
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                {[
                  ['B', () => wrapSelection('**', '**')],
                  ['I', () => wrapSelection('_', '_')],
                  ['U', () => wrapSelection('__', '__')],
                  ['Link', () => wrapSelection('[', '](https://)')],
                  ['• List', () => wrapSelection('- ', '')],
                  ['" Quote', () => wrapSelection('> ', '')],
                ].map(([label, fn]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={fn}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={bodyRef}
              className="nc-body-textarea message-body-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                notifType === 'email'
                  ? 'Write your notification message here, or generate with AI →'
                  : 'Write your notification message here...'
              }
              style={{
                flex: 1,
                width: '100%',
                minHeight: 300,
                boxSizing: 'border-box',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 14,
                lineHeight: 1.7,
                padding: 16,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />

            {notifType === 'sms' && (
              <div style={{ padding: '0 16px 12px', fontSize: 12, color: smsColor }}>
                {smsLen} / 160 · {Math.max(1, Math.ceil(smsLen / 160))} SMS segment{Math.ceil(smsLen / 160) > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div
            className="nc-bottom-bar composer-bottom-toolbar"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '10px max(12px, env(safe-area-inset-left)) 10px max(12px, env(safe-area-inset-right))',
              paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
              borderTop: '1px solid var(--divider)',
            }}
          >
            <div className="bottom-icon-buttons" style={{ display: 'flex', gap: 16 }}>
            {[
              ['📎', () => showToast('Attachments coming soon', 'success')],
              ['🔗', () => wrapSelection('[text](', ')')],
              [
                '{x}',
                () => {
                  setShowVarDd((v) => !v);
                },
              ],
              [
                '🖨️',
                () => {
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(`<pre style="font-family:sans-serif;padding:24px">${subject}\n\n${body}</pre>`);
                    w.document.close();
                  }
                },
              ],
              ['✅', () => showToast('No obvious spam triggers detected', 'success')],
            ].map(([icon, fn], i) => (
              <div key={i} style={{ position: 'relative' }} ref={i === 2 ? varDdRef : undefined}>
                <button
                  type="button"
                  onClick={fn as () => void}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  {icon}
                </button>
                {i === 2 && showVarDd && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: 6,
                      background: 'var(--modal-bg)',
                      border: '1px solid var(--border-visible)',
                      borderRadius: 8,
                      minWidth: 180,
                      zIndex: 60,
                    }}
                  >
                    {['{{username}}', '{{order_id}}', '{{amount}}', '{{product_name}}', '{{store_name}}'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const ta = bodyRef.current;
                          if (ta) {
                            const p = ta.selectionStart;
                            const val = ta.value;
                            const next = val.slice(0, p) + v + val.slice(p);
                            setBody(next);
                          }
                          setShowVarDd(false);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            </div>

            {notifType === 'email' && (
              <div className="nc-bottom-email-actions test-send-section" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={fromEmail}
                  title="Test recipient — defaults to your admin email if empty"
                  style={{
                    width: 160,
                    maxWidth: '40vw',
                    background: 'var(--btn-ghost-hover-bg)',
                    border: '1px solid var(--border-visible)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSend(true)}
                  disabled={sending}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    border: '1px solid var(--divider-strong)',
                    background: 'transparent',
                    color: 'var(--text-disabled)',
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Send test
                </button>
                <button
                  type="button"
                  onClick={() => handleSend(false)}
                  disabled={sending}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    background: sending ? '#007A68' : '#00BFA5',
                    color: 'white',
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        {!aiCollapsed && (
          <AiAssistantPanel
            collapsed={aiCollapsed}
            isWorkspaceMode={aiWorkspaceMode}
            isMobileViewport={isMobileViewport}
            onCollapse={() => {
              if (aiWorkspaceMode && isMobileViewport) {
                setAiWorkspaceMode(false);
              } else {
                setAiCollapsed(true);
              }
            }}
            subject={subject}
            body={body}
            loading={aiLoading}
            onApplyToEditor={(nextSubject, nextBody) => {
              if (nextSubject) setSubject(nextSubject);
              if (nextBody) setBody(nextBody);
            }}
            onSaveDraft={handleSaveDraft}
            onSchedule={() => setShowScheduleModal(true)}
            onSend={() => void handleSend(false)}
            onRewriteEditor={() => void generateAI('Rephrase this notification with better clarity and conversion focus')}
            generate={generateAiCopilot}
          />
        )}

        {aiCollapsed && (
          <button
            type="button"
            className="nc-ai-expand ai-panel-trigger-tab floating-ai-tab"
            onClick={() => setAiCollapsed(false)}
            style={{
              width: 36,
              flexShrink: 0,
              border: 'none',
              borderLeft: '1px solid var(--divider)',
              background: 'color-mix(in srgb, var(--bg-page) 88%, rgba(0,191,165,0.06))',
              color: '#00BFA5',
              cursor: 'pointer',
              fontSize: 18,
              minHeight: 44,
            }}
            title="Show AI panel"
            aria-label="Show AI assistant panel"
          >
            <span className="nc-ai-expand-desktop" aria-hidden>
              ‹
            </span>
            <span className="nc-ai-expand-mobile">✦ AI assistant</span>
          </button>
        )}
      </div>
        </div>

      {/* Schedule modal */}
      {showScheduleModal && (
        <div
          role="presentation"
          className="nc-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="nc-modal-dialog schedule-modal-box"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--modal-border)',
              borderRadius: 18,
              padding: 24,
              width: 400,
              maxWidth: '100%',
              boxShadow: 'var(--shadow-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Schedule Notification</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Choose when to send this notification</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Date</div>
              <input
                type="date"
                className="nc-native-datetime"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Time</div>
              <input
                type="time"
                className="nc-native-datetime"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>Timezone: Africa/Kigali (CAT, UTC+2)</div>
            <div className="schedule-modal-buttons" style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: '1px solid var(--border-visible)',
                  background: 'transparent',
                  color: 'var(--text-disabled)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: 'none',
                  background: '#00BFA5',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates modal */}
      {showTemplatesModal && (
        <div
          role="presentation"
          className="nc-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
          }}
          onClick={() => setShowTemplatesModal(false)}
        >
          <div
            role="dialog"
            className="nc-modal-dialog nc-modal-dialog--scroll"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--modal-border)',
              borderRadius: 18,
              padding: 20,
              width: 480,
              maxWidth: '100%',
              maxHeight: 'min(80vh, 90dvh)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              boxShadow: 'var(--shadow-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Templates</div>
            {loadingTemplates ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : (
              templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSubject(tpl.subject || '');
                    setBody(tpl.content || '');
                    setShowTemplatesModal(false);
                    showToast('Template applied', 'success');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: 10,
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--btn-ghost-hover-bg)',
                    border: '1px solid var(--border-visible)',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--btn-ghost-hover-bg)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{tpl.name}</span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: 'rgba(0,191,165,0.12)',
                        color: '#00BFA5',
                        border: '1px solid rgba(0,191,165,0.3)',
                      }}
                    >
                      {tpl.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tpl.subject || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{tpl.lastModified || tpl.updatedAt || ''}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {showSaveTplModal && (
        <div
          role="presentation"
          className="nc-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
          }}
          onClick={() => setShowSaveTplModal(false)}
        >
          <div
            role="dialog"
            className="nc-modal-dialog"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--modal-border)',
              borderRadius: 18,
              padding: 24,
              width: 360,
              maxWidth: '100%',
              boxShadow: 'var(--shadow-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Save template</div>
            <input
              value={newTplName}
              onChange={(e) => setNewTplName(e.target.value)}
              placeholder="Template name"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 16,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-visible)',
                background: 'var(--btn-ghost-hover-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowSaveTplModal(false)}
                style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid var(--divider-strong)', background: 'transparent', color: 'var(--text-disabled)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewTemplate}
                style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', background: '#00BFA5', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      <style>{`
        @keyframes ncShimmer {
          0% { background-position: -400px 0 }
          100% { background-position: 400px 0 }
        }
        .nc-shimmer {
          background-size: 400px 100%;
          animation: ncShimmer 1.5s ease-in-out infinite;
        }
        [data-theme='light'] .nc-shimmer {
          background: linear-gradient(90deg,
            rgba(15,23,42,0.05) 25%,
            rgba(15,23,42,0.09) 50%,
            rgba(15,23,42,0.05) 75%);
        }
        [data-theme='dark'] .nc-shimmer,
        .dark .nc-shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 75%);
        }
        @keyframes ncSlideIn {
          from { transform: translateY(8px); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
        .nc-root {
          position: relative;
          isolation: isolate;
          background-color: var(--bg-page);
          background-attachment: fixed;
        }
        [data-theme='light'] .nc-root {
          background-image:
            radial-gradient(ellipse 120% 72% at 50% -26%, rgba(13, 148, 136, 0.055), transparent 58%),
            linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-page) 38%, var(--bg-page) 100%);
        }
        [data-theme='dark'] .nc-root,
        .dark .nc-root {
          background-image:
            radial-gradient(ellipse 140% 90% at 50% -30%, rgba(0, 191, 165, 0.11), transparent 55%),
            radial-gradient(ellipse 70% 45% at 100% 0%, rgba(0, 191, 165, 0.06), transparent 45%),
            radial-gradient(ellipse 60% 40% at 0% 100%, rgba(99, 102, 241, 0.05), transparent 50%),
            linear-gradient(180deg, color-mix(in srgb, var(--bg-page) 92%, #0a1628) 0%, var(--bg-page) 38%, var(--bg-page) 100%);
        }
        .nc-root::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 85% 70% at 50% 20%, black 15%, transparent 70%);
        }
        [data-theme='light'] .nc-root::before {
          opacity: 0.45;
          background-image:
            linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
        }
        [data-theme='dark'] .nc-root::before,
        .dark .nc-root::before {
          opacity: 0.35;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
        }

        .nc-topbar {
          backdrop-filter: saturate(160%) blur(14px);
          -webkit-backdrop-filter: saturate(160%) blur(14px);
        }
        [data-theme='light'] .nc-topbar {
          border-bottom: 1px solid var(--header-border);
          background: color-mix(in srgb, var(--card-bg) 94%, var(--bg-tertiary)) !important;
          box-shadow: var(--shadow-xs);
        }
        [data-theme='dark'] .nc-topbar,
        .dark .nc-topbar {
          border-bottom: 1px solid color-mix(in srgb, rgba(0, 191, 165, 0.35) 25%, rgba(255,255,255,0.06));
          background: color-mix(in srgb, var(--bg-page) 82%, transparent) !important;
          box-shadow: 0 1px 0 rgba(0, 191, 165, 0.06);
        }

        [data-theme='light'] .nc-left {
          background: var(--card-bg);
        }
        .nc-native-datetime {
          color-scheme: light;
        }
        [data-theme='dark'] .nc-native-datetime,
        .dark .nc-native-datetime {
          color-scheme: dark;
        }

        .nc-main,
        .nc-topbar,
        .nc-left,
        .nc-right,
        .nc-ai-expand {
          position: relative;
          z-index: 1;
        }

        .nc-composer-glow {
          box-shadow: inset 0 0 80px rgba(0, 191, 165, 0.03);
        }
        [data-theme='light'] .nc-composer-glow {
          box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.03);
        }

        .nc-ai-panel {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        [data-theme='light'] .nc-ai-panel {
          border-left: 1px solid var(--divider) !important;
          background: var(--bg-tertiary) !important;
        }
        [data-theme='dark'] .nc-ai-panel,
        .dark .nc-ai-panel {
          border-left: 1px solid color-mix(in srgb, rgba(0, 191, 165, 0.2) 40%, rgba(255,255,255,0.06)) !important;
          background: color-mix(in srgb, var(--bg-secondary) 94%, rgba(0, 191, 165, 0.06)) !important;
        }

        .nc-tab-btn:focus-visible {
          outline: 2px solid #00BFA5;
          outline-offset: 2px;
        }

        .nc-btn-ghost:active {
          transform: scale(0.98);
        }
        .nc-btn-send:active:not(:disabled) {
          transform: scale(0.98);
        }

        @media (max-width: 768px) {
          .nc-main {
            flex-direction: column !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch;
          }
          .nc-left {
            border-right: none !important;
            width: 100% !important;
            min-height: min(60vh, 520px);
          }
          .nc-right {
            width: 100% !important;
            max-width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--border-visible);
            min-height: 280px;
          }
          .nc-topbar {
            flex-wrap: wrap;
            min-height: 44px;
          }
          .nc-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 4px;
            scrollbar-width: thin;
          }
        }

        @media (max-width: 768px) {
          .nc-tab-label {
            font-size: 11px;
          }
          .nc-tab-btn {
            padding: 8px 12px !important;
            min-height: 40px !important;
          }
          .nc-composer-toolbar button {
            min-height: 40px;
            padding: 8px 12px !important;
          }
          .nc-subject-input {
            min-height: 48px !important;
            font-size: 16px !important;
            padding: 12px 16px !important;
          }
          .nc-body-textarea {
            min-height: 220px !important;
            font-size: 16px !important;
          }
          .nc-format-bar button {
            min-width: 40px !important;
            min-height: 40px !important;
            padding: 0 8px !important;
          }
          .nc-bottom-bar {
            flex-wrap: wrap !important;
            gap: 10px !important;
            align-items: flex-start !important;
          }
          .nc-bottom-email-actions {
            margin-left: 0 !important;
            width: 100%;
            flex-direction: column !important;
            align-items: stretch !important;
            order: 10;
          }
          .nc-bottom-email-actions input {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 44px;
            box-sizing: border-box;
            padding: 10px 12px !important;
          }
          .nc-bottom-email-actions button {
            min-height: 44px;
            flex: 1 1 auto;
          }
          .nc-bottom-bar > div[style*="position: relative"] button[type="button"] {
            min-width: 44px;
            min-height: 44px;
          }
          .nc-modal-overlay {
            align-items: flex-end !important;
          }
          .nc-modal-dialog {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 18px 18px 0 0 !important;
            max-height: min(92dvh, 92vh) !important;
            overflow-y: auto;
          }
          .nc-modal-dialog--scroll {
            max-height: min(88dvh, 88vh) !important;
          }
          .nc-toast {
            right: 12px !important;
            left: 12px !important;
            max-width: none !important;
          }
          @keyframes ncSlideIn {
            from { transform: translateY(12px); opacity: 0 }
            to { transform: translateY(0); opacity: 1 }
          }
        }

        @media (max-width: 480px) {
          .nc-tab-btn .nc-tab-label {
            display: none;
          }
          .nc-tab-btn {
            padding: 10px 12px !important;
          }
          .composer-field-row {
            flex-direction: column;
            align-items: flex-start !important;
            padding: 8px 12px !important;
          }
          .composer-field-label {
            width: auto !important;
            padding: 0 0 4px 0 !important;
            font-size: 11px !important;
            text-transform: uppercase;
            letter-spacing: .06em;
          }
          .composer-field-content {
            width: 100%;
          }
          .target-group-select {
            margin-top: 6px;
            width: 100%;
            text-align: left;
          }
        }

        @media (min-width: 481px) and (max-width: 768px) {
          .composer-field-label {
            width: 56px !important;
            font-size: 12px !important;
          }
          .target-group-select {
            font-size: 11px;
            padding: 3px 6px !important;
          }
        }

        .ai-panel-mobile-header {
          display: none;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }

        .nc-main.nc-main--ai-collapsed .nc-ai-expand {
          border-left: 1px solid var(--border-visible);
        }
        .nc-ai-expand-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .notifications-page-root {
            overflow-x: hidden;
            width: 100%;
            max-width: 100vw;
          }
          .notifications-page-root * {
            max-width: 100%;
            box-sizing: border-box;
          }
          .notifications-page-root > * {
            padding-left: 12px;
            padding-right: 12px;
          }
          .two-panel-container {
            flex-direction: column !important;
          }
          .right-ai-panel {
            width: 100% !important;
            min-width: unset !important;
            max-width: unset !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
          }
          .left-composer-panel {
            width: 100% !important;
            min-width: unset !important;
          }
          .top-action-bar {
            flex-wrap: wrap;
            height: auto !important;
            padding: 8px 12px !important;
            gap: 8px !important;
          }
          .auto-save-toggle {
            order: 1;
            flex: 0 0 auto;
          }
          .schedule-btn {
            order: 2;
            flex: 1 !important;
            justify-content: center;
          }
          .save-draft-btn {
            order: 3;
            width: 100%;
            flex: 0 0 100% !important;
            justify-content: center;
          }
          .send-now-btn {
            order: 4;
            width: 100%;
            flex: 0 0 100% !important;
            height: 48px !important;
            font-size: 15px !important;
            justify-content: center;
          }
          .notification-type-tabs {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            flex-wrap: nowrap !important;
            padding-bottom: 4px;
            -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
            mask-image: linear-gradient(to right, black 85%, transparent 100%);
          }
          .notification-type-tabs::-webkit-scrollbar {
            display: none;
          }
          .notification-type-tabs .tab-pill {
            flex-shrink: 0;
            white-space: nowrap;
          }
          .ai-panel-trigger-tab,
          .floating-ai-tab,
          [class*="ai-assistant-tab"],
          [class*="aiAssistantTab"] {
            display: none !important;
          }
          .right-ai-panel::before {
            content: '';
            display: block;
          }
          .ai-panel-mobile-header {
            display: flex !important;
            align-items: center;
            gap: 8px;
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            font-size: 14px;
            font-weight: 600;
            color: #F1F5F9;
            background: rgba(0,191,165,0.04);
          }
          .rich-text-toolbar {
            padding: 6px 12px !important;
            gap: 2px !important;
            overflow-x: auto;
            scrollbar-width: none;
            flex-wrap: nowrap !important;
          }
          .rich-text-toolbar::-webkit-scrollbar {
            display: none;
          }
          .rich-text-toolbar button {
            min-width: 32px !important;
            height: 32px !important;
            font-size: 12px !important;
            flex-shrink: 0;
          }
          .composer-toolbar-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 10px 12px !important;
          }
          .composer-toolbar-row button {
            width: 100%;
            justify-content: center;
            font-size: 11px !important;
            padding: 7px 8px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .composer-bottom-toolbar {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          .bottom-icon-buttons {
            display: flex;
            gap: 16px;
          }
          .test-send-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .test-send-section input {
            width: 100% !important;
          }
          .test-send-section button {
            width: 100%;
          }
          .subject-field-wrapper {
            padding: 12px 12px 4px !important;
          }
          .subject-input {
            padding: 8px 12px 14px !important;
            font-size: 16px !important;
          }
          input, textarea, select {
            font-size: 16px !important;
          }
          .message-body-textarea {
            min-height: 200px !important;
            height: 200px !important;
            resize: vertical;
          }
          .ai-suggestion-row {
            padding: 0 12px !important;
          }
          .ai-suggestion-header {
            padding: 14px 0 !important;
            min-height: 48px;
          }
          .ai-suggestion-header button {
            min-width: 36px !important;
            min-height: 36px !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .tone-pills-row {
            flex-wrap: wrap !important;
            gap: 8px !important;
            padding: 12px !important;
          }
          .tone-pill {
            padding: 6px 14px !important;
            font-size: 12px !important;
            min-height: 36px;
          }
          .ai-generate-buttons {
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .ai-generate-buttons button {
            width: 100% !important;
            height: 44px !important;
            font-size: 14px !important;
          }
          .ask-me-anything {
            padding: 12px !important;
          }
          .ask-me-anything input {
            font-size: 16px !important;
          }
          .ab-testing-panel {
            padding: 16px 12px !important;
          }
          .ab-testing-panel textarea {
            font-size: 16px !important;
            min-height: 88px !important;
          }
          .ab-launch-button {
            height: 44px !important;
            font-size: 14px !important;
          }
          .schedule-modal-box {
            width: calc(100vw - 32px) !important;
            max-width: 400px !important;
            margin: 0 16px;
            padding: 20px 16px !important;
          }
          .schedule-modal-box input[type="date"],
          .schedule-modal-box input[type="time"] {
            font-size: 16px !important;
          }
          .schedule-modal-buttons {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .schedule-modal-buttons button {
            width: 100% !important;
            height: 44px !important;
          }
          .toast-notification {
            bottom: 80px !important;
            right: 12px !important;
            left: 12px !important;
            width: auto !important;
            max-width: unset !important;
            text-align: center;
          }
          .nc-ai-expand-desktop {
            display: none;
          }
          .nc-ai-expand-mobile {
            display: inline;
          }
          .nc-main.nc-main--ai-collapsed {
            flex-direction: column !important;
          }
          .nc-main.nc-main--ai-collapsed .nc-ai-expand {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid color-mix(in srgb, rgba(0, 191, 165, 0.25) 35%, rgba(255,255,255,0.08));
            min-height: 48px;
            font-size: 15px !important;
            font-weight: 600;
            letter-spacing: 0.02em;
          }
          .nc-main--ai-workspace .left-composer-panel--hidden-mobile {
            display: none !important;
          }
          .nc-main--ai-workspace .right-ai-panel {
            width: 100% !important;
            border-left: none !important;
            border-right: none !important;
          }
        }
      `}</style>
    </div>
  );
}
