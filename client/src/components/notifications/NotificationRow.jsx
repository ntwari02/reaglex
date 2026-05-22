import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Trash2 } from 'lucide-react';
import { getTypeMeta, formatDealCountdown } from '../../lib/notificationPresentation';
import OrderProgressTrack from './OrderProgressTrack';

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
}) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [dragX, setDragX] = useState(0);
  const meta = getTypeMeta(n.type, n.presentationType);
  const Icon = meta.Icon;

  const handleOpen = () => {
    if (n.unread) onMarkRead?.(n.id, n);
    if (onPress) {
      onPress(n);
      return;
    }
    if (n.type === 'order' && n.orderId) navigate(`/track/${n.orderId}`);
    else if (n.type === 'message' && n.threadId) navigate('/account?tab=messages');
    else if (n.type === 'deal') navigate('/search?sort=discount');
    else if (n.type === 'system') navigate('/notifications');
    else if (n.type === 'review') navigate('/account?tab=reviews');
  };

  const showTransit =
    n.type === 'order' && (n.orderStatus === 'shipped' || n.statusTone === 'transit');

  return (
    <div className="rxn-row-wrap">
      {enableSwipe && onDelete && (
        <button
          type="button"
          className="rxn-row-delete"
          aria-label="Delete notification"
          onClick={() => onDelete(n.id)}
        >
          <Trash2 size={18} strokeWidth={1.75} />
        </button>
      )}
      <motion.article
        layout
        className={`rxn-row rxn-row--premium${n.unread ? ' rxn-row--unread' : ''}`}
        style={enableSwipe && !reduceMotion ? { x: dragX } : undefined}
        drag={enableSwipe && onDelete && !reduceMotion ? 'x' : false}
        dragConstraints={{ left: SWIPE_DELETE, right: 0 }}
        dragElastic={0.08}
        onDrag={(_, info) => setDragX(Math.min(0, info.offset.x))}
        onDragEnd={(_, info) => {
          if (info.offset.x < SWIPE_DELETE * 0.55) onDelete?.(n.id);
          setDragX(0);
        }}
        whileTap={{ scale: 0.985 }}
      >
        {n.unread && <span className="rxn-row-accent-bar" aria-hidden />}
        <button type="button" className="rxn-row-hit" onClick={handleOpen}>
          <span
            className="rxn-row-icon rxn-row-icon--glow"
            style={{
              background: meta.surface,
              borderColor: meta.border,
              color: meta.accent,
              boxShadow: meta.glow ? `0 0 24px ${meta.glow}` : undefined,
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
          </span>

          <span className="rxn-row-body">
            <span className="rxn-row-top">
              <span className="rxn-row-type" style={{ color: meta.accent }}>
                {meta.label}
              </span>
              <span className="rxn-row-time">{n.time}</span>
            </span>
            <span className={`rxn-row-title${n.unread ? ' rxn-row-title--bold' : ''}`}>{n.title}</span>
            <span className="rxn-row-message">{n.message}</span>

            {n.type === 'order' && n.statusLabel && (
              <StatusBadge
                label={n.statusLabel}
                tone={n.statusTone === 'transit' ? 'transit' : 'confirmed'}
              />
            )}

            {n.type === 'order' && n.progress && (
              <OrderProgressTrack progress={n.progress} compact glow={showTransit} />
            )}

            {n.type === 'deal' && n.dealEndsAt && <DealCountdown endsAt={n.dealEndsAt} />}

            {n.presentationType === 'ai' && <AiThumbs images={n.aiThumbs} />}

            {n.type === 'order' && n.orderId && (
              <Link
                to={`/track/${n.orderId}`}
                onClick={(e) => e.stopPropagation()}
                className="rxn-row-chip"
              >
                Order {n.orderId}
              </Link>
            )}
          </span>

          <ChevronRight className="rxn-row-chevron" size={18} strokeWidth={1.75} />
        </button>
      </motion.article>
    </div>
  );
}
