import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bot,
  Check,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Tag,
  Ticket,
  Truck,
} from 'lucide-react';
import type { NormalizedNotification, NotificationVariant } from './types';

function useCountdown(endMs?: number) {
  const safeEnd = endMs && endMs > Date.now() ? endMs : null;
  const [left, setLeft] = useState(() =>
    safeEnd ? Math.max(0, Math.floor((safeEnd - Date.now()) / 1000)) : 0,
  );
  useEffect(() => {
    if (!safeEnd) return undefined;
    const t = setInterval(
      () => setLeft(Math.max(0, Math.floor((safeEnd - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(t);
  }, [safeEnd]);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { text: `${pad(h)}h : ${pad(m)}m : ${pad(s)}s`, active: !!safeEnd && left > 0 };
}

const VARIANT_UI: Record<NotificationVariant, { tone: string; Icon: typeof ShoppingBag }> = {
  order_confirmed: { tone: 'orange', Icon: ShoppingBag },
  shipping: { tone: 'blue', Icon: Truck },
  out_for_delivery: { tone: 'blue', Icon: Truck },
  delivered: { tone: 'green', Icon: ShoppingBag },
  live: { tone: 'red', Icon: Sparkles },
  upcoming: { tone: 'purple', Icon: Sparkles },
  ai: { tone: 'cyan', Icon: Bot },
  flash_sale: { tone: 'orange', Icon: Tag },
  escrow: { tone: 'muted', Icon: Shield },
  security: { tone: 'security', Icon: ShieldAlert },
  system: { tone: 'muted', Icon: Shield },
  social: { tone: 'cyan', Icon: Bot },
  deal: { tone: 'purple', Icon: Ticket },
  message: { tone: 'cyan', Icon: Bot },
};

function displayTitle(item: NormalizedNotification): string {
  const map: Partial<Record<NotificationVariant, string>> = {
    order_confirmed: 'Order confirmed',
    shipping: 'Order shipped',
    out_for_delivery: 'Out for delivery',
    delivered: 'Order delivered',
    flash_sale: 'Flash sale starting soon!',
    ai: 'AI picks for you',
    security: 'Security alert',
    escrow: 'Escrow update',
    deal: 'Exclusive offer available',
  };
  if (map[item.variant]) return map[item.variant]!;
  if (item.type === 'review' || item.title?.toLowerCase().includes('review')) return 'Review request';
  return item.title;
}

function renderDescription(item: NormalizedNotification) {
  const msg = item.message || '';
  const orderId = item.orderId;

  if (item.variant === 'flash_sale') {
    const parts = msg.split(/(60%|%\s*off|\d+%)/i);
    if (parts.length > 1) {
      return (
        <>
          {parts.map((part, i) =>
            /%/.test(part) ? (
              <span key={i} className="rnx-m-highlight">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </>
      );
    }
    return (
      <>
        Electronics flash sale — <span className="rnx-m-highlight">60% OFF</span> limited time!
      </>
    );
  }

  if (orderId && (item.variant === 'order_confirmed' || item.variant === 'shipping')) {
    const prefix = item.variant === 'order_confirmed' ? 'Your order ' : 'Your order ';
    const suffix =
      item.variant === 'order_confirmed'
        ? ' has been confirmed and is being prepared.'
        : ' is on the way! Track live delivery.';
    return (
      <>
        {prefix}
        <span className="rnx-m-order-id">{orderId.startsWith('#') ? orderId : `#${orderId}`}</span>
        {suffix}
      </>
    );
  }

  if (item.variant === 'ai') {
    return 'Based on your browsing — curated picks with high match scores.';
  }

  return msg;
}

const AI_THUMBS = [
  'linear-gradient(135deg,#1e293b,#334155)',
  'linear-gradient(135deg,#422006,#78350f)',
  'linear-gradient(135deg,#1e1b4b,#312e81)',
];

type Props = {
  item: NormalizedNotification;
  sectionTone?: 'today' | 'earlier';
  onPress?: () => void;
};

export default function NotificationCenterCard({ item, sectionTone = 'today', onPress }: Props) {
  const isReview =
    item.type === 'review' || item.title?.toLowerCase().includes('review');
  const ui = VARIANT_UI[item.variant] || VARIANT_UI.system;
  const Icon = isReview ? Award : ui.Icon;
  const iconTone = isReview ? 'green' : ui.tone;
  const countdown = useCountdown(item.countdownEnd);
  const isFlash = item.variant === 'flash_sale';
  const isAi = item.variant === 'ai';
  const isShipping = item.variant === 'shipping' || item.variant === 'out_for_delivery';
  const isConfirmed = item.variant === 'order_confirmed';
  const showChevron = !isFlash;

  const dotClass =
    sectionTone === 'earlier' && !item.unread
      ? 'rnx-m-dot rnx-m-dot--blue'
      : item.unread
        ? 'rnx-m-dot'
        : 'rnx-m-dot is-hidden';

  return (
    <article
      className={`rnx-m-card${item.unread ? '' : ' is-read'}`}
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onPress) onPress();
      }}
    >
      <span className={dotClass} aria-hidden />

      <div className={`rnx-m-icon rnx-m-icon--${iconTone}`}>
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="rnx-m-body">
        <div className="rnx-m-title">{displayTitle(item)}</div>
        <div className="rnx-m-desc">{renderDescription(item)}</div>

        {isConfirmed && (
          <div className="rnx-m-status rnx-m-status--ok">
            <Check size={12} strokeWidth={2.5} />
            Confirmed
          </div>
        )}

        {isShipping && (
          <div className="rnx-m-ship">
            <div className="rnx-m-ship-track">
              <div
                className="rnx-m-ship-fill"
                style={{ width: `${Math.round((item.progress ?? 0.58) * 100)}%` }}
              />
              <div
                className="rnx-m-ship-pulse"
                style={{ left: `${Math.round((item.progress ?? 0.58) * 100)}%` }}
              />
            </div>
            <span className="rnx-m-in-transit">In transit</span>
          </div>
        )}

        {isAi && (
          <div className="rnx-m-thumbs">
            {AI_THUMBS.map((bg, i) => (
              <div key={i} className="rnx-m-thumb" style={{ background: bg }} />
            ))}
            <div className="rnx-m-thumb rnx-m-thumb--more">+3</div>
          </div>
        )}
      </div>

      <div className="rnx-m-aside">
        {!isFlash && <span className="rnx-m-time">{item.time}</span>}
        {isFlash && countdown.active && (
          <span className="rnx-m-countdown-pill">{countdown.text}</span>
        )}
        {showChevron && <ArrowRight size={18} className="rnx-m-chevron" strokeWidth={2} />}
      </div>
    </article>
  );
}
