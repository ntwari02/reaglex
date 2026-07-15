import React, { useEffect, useState } from 'react';
import { Bell, BellOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  getExistingSubscription,
  getNotificationPermission,
  getWebPushConfig,
  isWebPushSupported,
  subscribeWebPush,
  unsubscribeWebPush,
} from '../../lib/webPush';

type Status = 'loading' | 'unsupported' | 'disabled' | 'denied' | 'idle' | 'subscribed' | 'error';

export default function WebPushOptInCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isWebPushSupported()) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      const cfg = await getWebPushConfig();
      if (!cfg.enabled || !cfg.publicKey) {
        if (!cancelled) setStatus('disabled');
        return;
      }
      const perm = getNotificationPermission();
      if (perm === 'denied') {
        if (!cancelled) setStatus('denied');
        return;
      }
      const sub = await getExistingSubscription();
      if (!cancelled) setStatus(sub ? 'subscribed' : 'idle');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await subscribeWebPush();
      if (result.success) {
        setStatus('subscribed');
        setMessage('Browser notifications enabled. You can disable any time.');
      } else {
        if (result.reason === 'permission_denied') {
          setStatus('denied');
          setMessage('You blocked notifications in this browser. Enable them in your browser settings to receive alerts.');
        } else if (result.reason === 'unsupported') {
          setStatus('unsupported');
        } else if (result.reason === 'server_not_configured') {
          setStatus('disabled');
        } else {
          setStatus('error');
          setMessage(`Could not enable notifications: ${result.reason}`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await unsubscribeWebPush();
      setStatus('idle');
      setMessage('Browser notifications turned off.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <div
        className="rounded-[20px] p-5"
        style={{ background: 'var(--card-bg)' }}
      >
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Checking browser notification support…
        </p>
      </div>
    );
  }

  if (status === 'unsupported' || status === 'disabled') {
    return null;
  }

  const subscribed = status === 'subscribed';
  const denied = status === 'denied';

  return (
    <div
      className="rounded-[20px] p-6 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        background: 'var(--card-bg)',
        boxShadow: '0 14px 40px rgba(15,23,42,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start gap-4 flex-1">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: subscribed
              ? 'color-mix(in srgb, var(--brand-primary) 20%, transparent)'
              : 'color-mix(in srgb, #f59e0b 18%, transparent)',
            color: subscribed ? 'var(--brand-primary)' : '#f59e0b',
          }}
        >
          {subscribed ? <ShieldCheck className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold" style={{ color: '#ffffff' }}>
            {subscribed ? 'Browser notifications are on' : 'Get real-time updates'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {denied
              ? 'Notifications are blocked in this browser. Update your browser settings to enable them.'
              : subscribed
              ? 'You\u2019ll get order updates, deal alerts and recovery reminders even when this tab is closed.'
              : 'Receive order updates, deal alerts and cart reminders directly in your browser \u2014 even when Spacilly isn\u2019t open.'}
          </p>
          {message && (
            <p
              className="mt-2 inline-flex items-center gap-1 text-xs"
              style={{
                color: status === 'error' ? '#fca5a5' : 'var(--brand-primary)',
              }}
            >
              {status === 'error' && <AlertTriangle className="h-3 w-3" />}
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        {subscribed ? (
          <button
            type="button"
            onClick={handleDisable}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{
              background: 'rgba(148,163,184,0.18)',
              color: '#ffffff',
            }}
          >
            <BellOff className="h-4 w-4" />
            {busy ? 'Turning off…' : 'Turn off'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy || denied}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--brand-primary)' }}
          >
            <Bell className="h-4 w-4" />
            {denied ? 'Blocked by browser' : busy ? 'Enabling…' : 'Enable notifications'}
          </button>
        )}
      </div>
    </div>
  );
}
