import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/config';

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
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#94A3B8',
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
  const [aiCollapsed, setAiCollapsed] = useState(false);
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

  const launchAb = async () => {
    if (!variantA.trim() || !variantB.trim()) {
      return showToast('Add both variants first', 'error');
    }
    try {
      const n = recipientCount ?? specificEmails.length;
      const res = await fetch(`${NOTIFICATIONS_API}/ab-test`, {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          variantA,
          variantB,
          targetGroup: targetGroup || (userPills.length ? 'Specific User' : ''),
          subject,
          notificationType: 'email',
          specificEmails,
          recipientCount: targetGroup === 'All Customers' || targetGroup === 'All Sellers' ? recipientCount ?? n : n,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { message?: string }).message || 'Failed to launch A/B test', 'error');
        return;
      }
      showToast((data as { message?: string }).message || 'A/B test launched', 'success');
    } catch {
      showToast('Failed to launch A/B test', 'error');
    }
  };

  const smsLen = body.length;
  const smsColor = smsLen > 160 ? '#EF4444' : smsLen > 140 ? '#FB923C' : '#64748B';

  const tabDefs: { id: NotifTab; label: string; icon: string }[] = [
    { id: 'email', label: 'Email', icon: '✉' },
    { id: 'in-app', label: 'In-App', icon: '🔔' },
    { id: 'sms', label: 'SMS', icon: '💬' },
    { id: 'push', label: 'Push', icon: '📲' },
    { id: 'system-alert', label: 'System Alert', icon: '⚠' },
  ];

  return (
    <div
      className="nc-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: '#0D1117',
        fontFamily: 'inherit',
        margin: 0,
        padding: 0,
      }}
    >
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: '#161B27',
            border: '1px solid rgba(255,255,255,0.12)',
            borderLeft: toast.type === 'success' ? '3px solid #00BFA5' : '3px solid #EF4444',
            borderRadius: 10,
            padding: '14px 20px',
            color: '#F1F5F9',
            fontSize: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'ncSlideIn 0.25s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top action bar */}
      <div
        className="nc-topbar"
        style={{
          flexShrink: 0,
          height: 44,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0D1117',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          className="nc-tabs"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            minWidth: 0,
            overflowX: 'auto',
          }}
        >
          {tabDefs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setNotifType(t.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: 12,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: notifType === t.id ? '#00BFA5' : 'rgba(255,255,255,0.08)',
                background: notifType === t.id ? 'rgba(0,191,165,0.12)' : 'transparent',
                color: notifType === t.id ? '#00BFA5' : '#64748B',
                whiteSpace: 'nowrap',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Auto-save</span>
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
                background: autoSave ? '#00BFA5' : 'rgba(255,255,255,0.12)',
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
            onClick={() => setShowScheduleModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
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
            onClick={() => {
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
              showToast('Draft saved', 'success');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
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
              gap: 8,
              padding: '6px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: sending ? '#007A68' : '#00BFA5',
              color: 'white',
              cursor: sending ? 'not-allowed' : 'pointer',
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
        className="nc-main"
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
          className="nc-left"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: aiCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
            minHeight: 0,
          }}
        >
          {/* From */}
          <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 13,
                color: '#64748B',
                fontWeight: 500,
                padding: '14px 16px',
              }}
            >
              From
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '14px 16px 14px 0' }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>
                Admin &lt;{fromEmail}&gt;
              </span>
            </div>
          </div>

          {/* To */}
          <div
            ref={toRowRef}
            style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 13,
                color: '#64748B',
                fontWeight: 500,
                padding: '14px 16px',
              }}
            >
              To
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', minWidth: 0 }}>
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
                style={{
                  flex: 1,
                  minWidth: 120,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F1F5F9',
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
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94A3B8',
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
                    background: '#161B27',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    zIndex: 50,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
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
                        color: '#F1F5F9',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
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
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                background: '#161B27',
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
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#F1F5F9',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{u.fullName || 'User'}</span>
                  <span style={{ color: '#64748B', marginLeft: 8 }}>{u.email}</span>
                </button>
              ))}
            </div>
          )}

          {/* Cc */}
          <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 13,
                color: '#64748B',
                fontWeight: 500,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Cc
              {!showBcc && (
                <button type="button" onClick={() => setShowBcc(true)} style={{ fontSize: 11, color: '#00BFA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Bcc
                </button>
              )}
            </div>
            <input
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F1F5F9',
                fontSize: 13,
                padding: '14px 16px 14px 0',
              }}
            />
          </div>

          {showBcc && (
            <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div
                style={{
                  width: 72,
                  flexShrink: 0,
                  fontSize: 13,
                  color: '#64748B',
                  fontWeight: 500,
                  padding: '14px 16px',
                }}
              >
                Bcc
              </div>
              <input
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F1F5F9',
                  fontSize: 13,
                  padding: '14px 16px 14px 0',
                }}
              />
            </div>
          )}

          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#94A3B8';
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Subject */}
          <div>
            <div style={{ padding: '12px 16px 4px', fontSize: 13, color: '#64748B' }}>Subject</div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter notification subject..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                outline: 'none',
                color: '#F1F5F9',
                fontSize: 14,
                padding: '8px 16px',
              }}
            />
          </div>

          {/* Body area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 200, minWidth: 0 }}>
            {notifType === 'email' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexWrap: 'wrap',
                  padding: '8px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                      color: '#64748B',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
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
                color: '#F1F5F9',
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
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
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
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748B';
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
                      background: '#161B27',
                      border: '1px solid rgba(255,255,255,0.1)',
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
                          color: '#F1F5F9',
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

            {notifType === 'email' && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={fromEmail}
                  title="Test recipient — defaults to your admin email if empty"
                  style={{
                    width: 160,
                    maxWidth: '40vw',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#F1F5F9',
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
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'transparent',
                    color: '#94A3B8',
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
          <div
            className="nc-right"
            style={{
              width: 340,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              minHeight: 0,
              background: '#0D1117',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L14 8h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z"
                      stroke="#00BFA5"
                      strokeWidth="1.2"
                      fill="rgba(0,191,165,0.15)"
                    />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>Write with AI</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    title="Add variant slot"
                    onClick={() => {
                      const sid = nextSlotId;
                      const bid = nextSlotId + 1;
                      setSubjects((s) => [...s, { id: sid, text: '' }]);
                      setBodies((b) => [...b, { id: bid, text: '' }]);
                      setNextSlotId(sid + 2);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent',
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    title="Collapse AI panel"
                    onClick={() => setAiCollapsed(true)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent',
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                <div
                  style={{
                    padding: '12px 16px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Choose subject line
                </div>
                {subjects.map((s, i) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedSubject(s.id);
                      if (s.text) setSubject(s.text);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedSubject(s.id);
                        if (s.text) setSubject(s.text);
                      }
                    }}
                    style={{
                      padding: '0 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      background: selectedSubject === s.id ? 'rgba(0,191,165,0.05)' : 'transparent',
                      borderLeft: selectedSubject === s.id ? '2px solid #00BFA5' : '2px solid transparent',
                      marginLeft: selectedSubject === s.id ? -2 : 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', gap: 8 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: selectedSubject === s.id ? '1.5px solid #00BFA5' : '1.5px solid #334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {selectedSubject === s.id && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00BFA5' }} />
                        )}
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 500,
                          color: selectedSubject === s.id ? '#F1F5F9' : '#64748B',
                          marginLeft: 8,
                        }}
                      >
                        Subject {i + 1}
                      </span>
                      <button
                        type="button"
                        title="Regenerate"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateAI(`Regenerate only subject line ${i + 1}`);
                        }}
                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}
                      >
                        ↺
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subjects.length <= 1) return;
                          setSubjects((prev) => prev.filter((x) => x.id !== s.id));
                        }}
                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ padding: '0 0 10px 24px', fontSize: 12, color: '#64748B', lineHeight: 1.5, maxHeight: 36, overflow: 'hidden' }}>
                      {aiLoading ? (
                        <div className="nc-shimmer" style={{ height: 12, borderRadius: 6 }} />
                      ) : (
                        s.text || <span style={{ color: '#334155' }}>Empty — generate to fill</span>
                      )}
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    padding: '12px 16px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Choose body
                </div>
                {bodies.map((b, i) => {
                  const long = (b.text || '').length > 220;
                  const preview =
                    expandedBodyId === b.id ? b.text : (b.text || '').split('\n').slice(0, 3).join('\n');
                  return (
                    <div
                      key={b.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedBody(b.id);
                        if (b.text) {
                          setBody(b.text);
                          setAppliedBodyId(b.id);
                        }
                      }}
                      style={{
                        padding: '0 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: selectedBody === b.id ? 'rgba(0,191,165,0.05)' : 'transparent',
                        borderLeft: selectedBody === b.id ? '2px solid #00BFA5' : '2px solid transparent',
                        marginLeft: selectedBody === b.id ? -2 : 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', gap: 8 }}>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: selectedBody === b.id ? '1.5px solid #00BFA5' : '1.5px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {selectedBody === b.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00BFA5' }} />}
                        </div>
                        <span style={{ flex: 1, marginLeft: 8, fontSize: 13, fontWeight: 500, color: selectedBody === b.id ? '#F1F5F9' : '#64748B' }}>
                          Body {i + 1}
                          {appliedBodyId === b.id && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: '#00BFA5' }}>Applied ✓</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateAI(`Regenerate only body ${i + 1}`);
                          }}
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}
                        >
                          ↺
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (bodies.length <= 1) return;
                            setBodies((prev) => prev.filter((x) => x.id !== b.id));
                          }}
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ padding: '0 0 10px 24px', fontSize: 12, color: '#64748B', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {aiLoading ? (
                          <>
                            <div className="nc-shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 6 }} />
                            <div className="nc-shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 6 }} />
                            <div className="nc-shimmer" style={{ height: 12, borderRadius: 6, width: '60%' }} />
                          </>
                        ) : (
                          <>
                            {preview || <span style={{ color: '#334155' }}>Empty — generate to fill</span>}
                            {long && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedBodyId(expandedBodyId === b.id ? null : b.id);
                                }}
                                style={{
                                  display: 'block',
                                  marginTop: 4,
                                  background: 'none',
                                  border: 'none',
                                  color: '#00BFA5',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                {expandedBodyId === b.id ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Tone</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['professional', 'friendly', 'urgent', 'promotional', 'informative'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 99,
                          cursor: 'pointer',
                          border: tone === t ? '1.5px solid #00BFA5' : '1px solid rgba(255,255,255,0.08)',
                          background: tone === t ? 'rgba(0,191,165,0.08)' : 'rgba(255,255,255,0.02)',
                          color: tone === t ? '#00BFA5' : '#64748B',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 13, color: '#475569' }}>⌕</span>
                    <input
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Search events..."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: 36,
                        padding: '0 12px 0 32px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        color: '#F1F5F9',
                        fontSize: 13,
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(0,191,165,0.4)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                    />
                  </div>
                  {filteredEvents.length > 1 && eventSearch && (
                    <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                      {filteredEvents.map((ev) => (
                        <button
                          key={ev}
                          type="button"
                          onClick={() => {
                            setEventTrigger(ev);
                            setEventSearch('');
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#F1F5F9',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {ev}
                        </button>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: 13, color: '#F1F5F9' }}>{eventTrigger}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Use custom event trigger</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      Event class: transactional. Suggested tone set to professional.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
                  <button
                    type="button"
                    onClick={() => generateAI()}
                    disabled={aiLoading}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent',
                      color: '#94A3B8',
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {aiLoading ? '… ' : '↺ '}Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => generateAI()}
                    disabled={aiLoading}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      background: aiLoading ? '#007A68' : '#00BFA5',
                      color: 'white',
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <span>✨</span>
                    {aiLoading ? 'Generating…' : 'Generate Now'}
                  </button>
                </div>

                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <input
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiContext.trim()) {
                        generateAI(aiContext.trim());
                        setAiContext('');
                      }
                    }}
                    placeholder="Ask me anything..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F1F5F9',
                      fontSize: 13,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (aiContext.trim()) {
                        generateAI(aiContext.trim());
                        setAiContext('');
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            {/* A/B panel */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 16, flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 12 }}>A/B Testing</div>
              <textarea
                value={variantA}
                onChange={(e) => setVariantA(e.target.value)}
                placeholder="Variant A message..."
                style={{
                  width: '100%',
                  minHeight: 80,
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#F1F5F9',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  marginBottom: 8,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0,191,165,0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              />
              <textarea
                value={variantB}
                onChange={(e) => setVariantB(e.target.value)}
                placeholder="Variant B message..."
                style={{
                  width: '100%',
                  minHeight: 80,
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#F1F5F9',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  marginBottom: 12,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0,191,165,0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              />
              <button
                type="button"
                onClick={launchAb}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1.5px solid #00BFA5',
                  background: 'transparent',
                  color: '#00BFA5',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,191,165,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Launch 50/50 A/B test
              </button>
            </div>
          </div>
        )}

        {aiCollapsed && (
          <button
            type="button"
            onClick={() => setAiCollapsed(false)}
            style={{
              width: 36,
              flexShrink: 0,
              border: 'none',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              background: '#0D1117',
              color: '#00BFA5',
              cursor: 'pointer',
              fontSize: 18,
            }}
            title="Show AI panel"
          >
            ‹
          </button>
        )}
      </div>

      {/* Schedule modal */}
      {showScheduleModal && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: '#161B27',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 24,
              width: 400,
              maxWidth: '92vw',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>Schedule Notification</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Choose when to send this notification</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Date</div>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#F1F5F9',
                  fontSize: 13,
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Time</div>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#F1F5F9',
                  fontSize: 13,
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>Timezone: Africa/Kigali (CAT, UTC+2)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#94A3B8',
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
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowTemplatesModal(false)}
        >
          <div
            role="dialog"
            style={{
              background: '#161B27',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 20,
              width: 480,
              maxWidth: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F1F5F9', marginBottom: 12 }}>Templates</div>
            {loadingTemplates ? (
              <p style={{ color: '#64748B' }}>Loading…</p>
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
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{tpl.name}</span>
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
                  <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tpl.subject || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>{tpl.lastModified || tpl.updatedAt || ''}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {showSaveTplModal && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowSaveTplModal(false)}
        >
          <div
            role="dialog"
            style={{
              background: '#161B27',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 24,
              width: 360,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9', marginBottom: 12 }}>Save template</div>
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
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#F1F5F9',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowSaveTplModal(false)}
                style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
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

      <style>{`
        @keyframes ncShimmer {
          0% { background-position: -400px 0 }
          100% { background-position: 400px 0 }
        }
        .nc-shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 75%);
          background-size: 400px 100%;
          animation: ncShimmer 1.5s ease-in-out infinite;
        }
        @keyframes ncSlideIn {
          from { transform: translateX(20px); opacity: 0 }
          to { transform: translateX(0); opacity: 1 }
        }
        @media (max-width: 1200px) {
          .nc-main { flex-direction: column !important; overflow-y: auto !important; }
          .nc-left { border-right: none !important; width: 100% !important; }
          .nc-right { width: 100% !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.06); }
          .nc-topbar { flex-wrap: wrap; height: auto !important; min-height: 44px; }
          .nc-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
        }
      `}</style>
    </div>
  );
}
