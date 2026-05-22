import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  getExistingSubscription,
  getNotificationPermission,
  getWebPushConfig,
  isWebPushSupported,
  subscribeWebPush,
} from '../../lib/webPush';

export default function NotificationPushBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('rxn-push-banner-dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [canPush, setCanPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isWebPushSupported()) return;
      const cfg = await getWebPushConfig();
      if (!cfg.enabled || getNotificationPermission() === 'denied') return;
      const sub = await getExistingSubscription();
      if (!cancelled) {
        setCanPush(true);
        setSubscribed(Boolean(sub));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !canPush || subscribed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('rxn-push-banner-dismissed', '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rxn-push-banner">
      <div className="rxn-push-banner-icon" aria-hidden>
        <Bell size={18} strokeWidth={1.85} />
      </div>
      <div className="rxn-push-banner-copy">
        <p className="rxn-push-banner-title">Enable push notifications</p>
        <p className="rxn-push-banner-sub">Never miss orders, deals, or live drops</p>
      </div>
      <button
        type="button"
        className="rxn-push-banner-cta"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await subscribeWebPush();
          setBusy(false);
          if (res.success) {
            setSubscribed(true);
            dismiss();
          }
        }}
      >
        {busy ? '…' : 'Enable'}
      </button>
      <button type="button" className="rxn-push-banner-close" aria-label="Dismiss" onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
