import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import { motion, useReducedMotion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import {
  getTypeMeta,
  formatDealCountdown,
  getNotificationHref,
  getNotificationActionLabel,
} from '../../lib/notificationPresentation';
import OrderProgressTrack from './OrderProgressTrack';
import OsNotificationCard from './OsNotificationCard';

const SWIPE_DELETE = -72;

function StatusBadge({ label, tone = 'confirmed' }) {
  return <span className={`rxn-status-badge rxn-status-badge--${tone}`}>{label}</span>;
}

function DealCountdown({ endsAt }) {
  const [left, setLeft] = useState(() => Math.max(0, (endsAt || 0) - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (endsAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return (
    <span className="rxn-deal-timer" aria-live="polite">
      {formatDealCountdown(left)}
    </span>
  );
}

function AiThumbs({ images = [] }) {
  const thumbs = images.length
    ? images.slice(0, 3)
    : [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&q=80',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80',
      ];
  return (
    <div className="rxn-ai-thumbs">
      {thumbs.map((src, i) => (
        <img key={i} src={src} alt="" loading="lazy" />
      ))}
      {images.length > 2 && <span className="rxn-ai-thumbs-more">+3</span>}
    </div>
  );
}

export default function NotificationRow({
  notification: n,
  onPress,
  onMarkRead,
  onDelete,
  enableSwipe = true,
  index = 0,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [dragX, setDragX] = useState(0);
  const meta = getTypeMeta(n.type, n.presentationType);
  const Icon = meta.Icon;

  const handleOpen = () => {
    if (onPress) {
      if (n.unread) onMarkRead?.(n.id, n);
      onPress(n);
      return;
    }
    if (n.unread) onMarkRead?.(n.id, n);
    const href = getNotificationHref(n);
    if (href) navigate(href);
    else if (n.type === 'system') navigate('/notifications');
  };

  const showTransit =
    n.type === 'order' && (n.orderStatus === 'shipped' || n.statusTone === 'transit');

  const showThumbs =
    n.showProductPreview ||
    n.presentationType === 'ai' ||
    n.type === 'live' ||
    (n.type === 'order' && n.thumbnails?.length > 0) ||
    (n.type === 'system' && n.thumbnails?.length > 0);

  const footer = (
    <>
      {n.type === 'order' && n.statusLabel ? (
        <StatusBadge
          label={n.statusLabel}
          tone={n.statusTone === 'transit' ? 'transit' : 'confirmed'}
        />
      ) : null}

      {n.type === 'order' && n.progress ? (
        <OrderProgressTrack progress={n.progress} compact glow={showTransit} />
      ) : null}

      {n.type === 'deal' && n.dealEndsAt ? <DealCountdown endsAt={n.dealEndsAt} /> : null}

      {n.presentationType === 'ai' ? <AiThumbs images={n.aiThumbs || n.thumbnails} /> : null}

      {n.type === 'order' && n.orderId ? (
        <Link
          to={`/track/${n.orderId}`}
          onClick={(e) => e.stopPropagation()}
          className="rxn-row-chip"
        >
          Order {n.orderId}
        </Link>
      ) : null}
    </>
  );

  const hasFooter =
    (n.type === 'order' && (n.statusLabel || n.progress || n.orderId)) ||
    (n.type === 'deal' && n.dealEndsAt) ||
    n.presentationType === 'ai';

  const actionLabel = getNotificationActionLabel(n, t) || undefined;

  return (
    <div className="rxn-row-wrap rxn-row-wrap--os">
      {enableSwipe && onDelete ? (
        <button
          type="button"
          className="rxn-row-delete"
          aria-label="Delete notification"
          onClick={() => onDelete(n.id)}
        >
          <Trash2 size={18} strokeWidth={1.75} />
        </button>
      ) : null}
      <motion.div
        className="rxn-row-os-drag"
        style={enableSwipe && onDelete && !reduceMotion ? { x: dragX } : undefined}
        drag={enableSwipe && onDelete && !reduceMotion ? 'x' : false}
        dragConstraints={{ left: SWIPE_DELETE, right: 0 }}
        dragElastic={0.08}
        onDrag={(_, info) => setDragX(Math.min(0, info.offset.x))}
        onDragEnd={(_, info) => {
          if (info.offset.x < SWIPE_DELETE * 0.55) onDelete?.(n.id);
          setDragX(0);
        }}
      >
        <OsNotificationCard
          variant={n.osVariant || 'stack'}
          unread={n.unread}
          accent={meta.accent}
          surface={meta.surface}
          glow={n.osGlow || meta.glow}
          Icon={Icon}
          kicker={meta.label}
          title={n.title}
          message={n.message}
          time={n.time}
          actionLabel={actionLabel}
          thumbnails={n.thumbnails || n.aiThumbs || []}
          showThumbs={showThumbs}
          compact={n.compact !== false}
          footer={hasFooter ? footer : null}
          index={index}
          onClick={handleOpen}
        />
      </motion.div>
    </div>
  );
}
