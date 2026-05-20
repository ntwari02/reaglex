import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Globe,
  Package,
  Radio,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Users,
  Zap,
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

const VARIANT_UI: Record<
  NotificationVariant,
  { tone: string; Icon: typeof Package }
> = {
  order_confirmed: { tone: 'orange', Icon: ShoppingBag },
  shipping: { tone: 'blue', Icon: Truck },
  out_for_delivery: { tone: 'blue', Icon: Truck },
  delivered: { tone: 'green', Icon: Package },
  live: { tone: 'red', Icon: Radio },
  upcoming: { tone: 'purple', Icon: Sparkles },
  ai: { tone: 'cyan', Icon: Bot },
  flash_sale: { tone: 'orange', Icon: Tag },
  escrow: { tone: 'escrow', Icon: Shield },
  security: { tone: 'muted', Icon: ShieldAlert },
  system: { tone: 'muted', Icon: Globe },
  social: { tone: 'cyan', Icon: Users },
  deal: { tone: 'orange', Icon: Tag },
  message: { tone: 'cyan', Icon: Users },
};

type Props = {
  item: NormalizedNotification;
  onPress?: () => void;
  href?: string;
};

export default function NotificationCard({ item, onPress, href }: Props) {
  const ui = VARIANT_UI[item.variant] || VARIANT_UI.system;
  const Icon = ui.Icon;
  const countdown = useCountdown(item.countdownEnd);
  const isUpcoming = item.variant === 'upcoming';

  const body = (
    <article
      className={`rnx-card${item.unread ? '' : ' is-read'}${isUpcoming ? ' rnx-card--upcoming' : ''}${item.variant === 'escrow' ? ' rnx-card--escrow' : ''}`}
      onClick={onPress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onPress) onPress();
      }}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
    >
      <span className={`rnx-unread-dot${item.unread ? '' : ' is-hidden'}`} aria-hidden />

      <div className={`rnx-icon-surface rnx-icon-surface--${ui.tone}`}>
        <Icon strokeWidth={2} />
      </div>

      <div className="rnx-content">
        <div className="rnx-card-title">{item.title}</div>
        <div className="rnx-card-desc">{item.message}</div>
        <div className="rnx-meta-row">
          <span className="rnx-time">{item.time}</span>
          {item.orderId && (
            <span className="rnx-pill rnx-pill--confirmed">{item.orderId}</span>
          )}
          {item.metaLabel && item.variant === 'order_confirmed' && (
            <span className="rnx-pill rnx-pill--confirmed">{item.metaLabel}</span>
          )}
          {item.variant === 'live' && (
            <>
              <span className="rnx-pill rnx-pill--live">LIVE</span>
              {item.viewerCount && (
                <span className="rnx-pill rnx-pill--live">{item.viewerCount} watching</span>
              )}
            </>
          )}
          {item.variant === 'ai' && <span className="rnx-pill rnx-pill--ai">AI Pick</span>}
          {item.variant === 'flash_sale' && countdown.active && (
            <span className="rnx-countdown">{countdown.text}</span>
          )}
          {item.variant === 'security' && (
            <span className="rnx-pill" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>
              Review
            </span>
          )}
        </div>
        {typeof item.progress === 'number' && item.variant === 'shipping' && (
          <div className="rnx-progress" aria-hidden>
            <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
          </div>
        )}
        {item.variant === 'out_for_delivery' && (
          <div className="rnx-progress" aria-hidden>
            <span style={{ width: '82%', animation: 'rnx-shimmer 1.2s ease infinite' }} />
          </div>
        )}
      </div>

      {isUpcoming && item.teaserImage && (
        <img src={item.teaserImage} alt="" className="rnx-teaser" loading="lazy" />
      )}

      {item.variant === 'flash_sale' && (
        <Zap size={14} style={{ color: '#fb923c', flexShrink: 0 }} aria-hidden />
      )}

      <ArrowRight size={16} className="rnx-card-arrow" aria-hidden />
    </article>
  );

  if (href) {
    return (
      <Link to={href} style={{ textDecoration: 'none', color: 'inherit' }} onClick={onPress}>
        {body}
      </Link>
    );
  }
  return body;
}
