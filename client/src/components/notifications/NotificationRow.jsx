import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Trash2 } from 'lucide-react';
import { getTypeMeta } from '../../lib/notificationPresentation';
import OrderProgressTrack from './OrderProgressTrack';

const SWIPE_DELETE = -72;

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
  const meta = getTypeMeta(n.type);
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
        className={`rxn-row${n.unread ? ' rxn-row--unread' : ''}`}
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
        <button type="button" className="rxn-row-hit" onClick={handleOpen}>
          <span
            className="rxn-row-icon"
            style={{
              background: meta.surface,
              borderColor: meta.border,
              color: meta.accent,
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
            {n.unread && <span className="rxn-row-unread-dot" aria-hidden />}
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

            {n.type === 'order' && n.progress && (
              <OrderProgressTrack progress={n.progress} compact />
            )}

            {n.type === 'order' && n.orderId && (
              <Link
                to={`/track/${n.orderId}`}
                onClick={(e) => e.stopPropagation()}
                className="rxn-row-chip"
              >
                Track {n.orderId}
              </Link>
            )}
          </span>

          <ChevronRight className="rxn-row-chevron" size={18} strokeWidth={1.75} />
        </button>
      </motion.article>
    </div>
  );
}
