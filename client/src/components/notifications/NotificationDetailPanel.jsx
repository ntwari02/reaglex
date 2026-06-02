import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getTypeMeta,
  getNotificationHref,
  getNotificationActionLabel,
} from '../../lib/notificationPresentation';
import OrderProgressTrack from './OrderProgressTrack';
import OsNotificationCard from './OsNotificationCard';

function DealCountdown({ endsAt }) {
  const [left, setLeft] = useState(() => Math.max(0, (endsAt || 0) - Date.now()));
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (endsAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const text = `${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`;
  return <span className="rxn-detail-deal-timer">{text}</span>;
}

export default function NotificationDetailPanel({
  notification: n,
  onBack,
  onOpen,
  onDelete,
  compact = false,
}) {
  const { t } = useTranslation();
  const meta = getTypeMeta(n.type, n.presentationType);
  const Icon = meta.Icon;
  const href = getNotificationHref(n);
  const actionLabel = getNotificationActionLabel(n, t);
  const showTransit =
    n.type === 'order' && (n.orderStatus === 'shipped' || n.statusTone === 'transit');
  const thumbs = n.thumbnails || n.aiThumbs || [];

  return (
    <motion.div
      className={`rxn-detail${compact ? ' rxn-detail--compact' : ''}`}
      initial={{ opacity: 0, x: compact ? 24 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: compact ? 24 : 12 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rxn-detail-toolbar">
        <motion.button
          type="button"
          className="rxn-detail-back"
          onClick={onBack}
          aria-label={t('notifications.backToList')}
          whileTap={{ scale: 0.9 }}
          whileHover={{ x: -2 }}
        >
          <motion.span
            animate={{ x: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2.5 }}
          >
            <ArrowLeft size={20} strokeWidth={2.25} />
          </motion.span>
        </motion.button>
        <span className="rxn-detail-toolbar-label">{t('notifications.detailTitle')}</span>
        {onDelete ? (
          <button
            type="button"
            className="rxn-detail-delete"
            onClick={() => {
              onDelete(n.id);
              onBack?.();
            }}
            aria-label={t('notifications.delete')}
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        ) : (
          <span className="rxn-detail-toolbar-spacer" aria-hidden />
        )}
      </div>

      <div className="rxn-detail-scroll">
        <div className="rxn-detail-hero-card">
          <OsNotificationCard
            variant={n.osVariant === 'hero' ? 'hero' : 'stack'}
            unread={false}
            accent={meta.accent}
            surface={meta.surface}
            glow={n.osGlow || meta.glow}
            Icon={Icon}
            kicker={meta.label}
            title={n.title}
            message={n.message}
            time={n.time}
            thumbnails={thumbs}
            showThumbs={thumbs.length > 0}
            compact={false}
          />
        </div>

        {n.message && n.message.length > 80 ? (
          <section className="rxn-detail-section">
            <h3 className="rxn-detail-section-title">{t('notifications.fullMessage')}</h3>
            <p className="rxn-detail-body">{n.message}</p>
          </section>
        ) : null}

        {n.type === 'order' && n.progress ? (
          <section className="rxn-detail-section">
            <h3 className="rxn-detail-section-title">{t('notifications.orderProgress')}</h3>
            <OrderProgressTrack progress={n.progress} glow={showTransit} />
            {n.orderId ? (
              <p className="rxn-detail-meta-line">
                {t('notifications.orderRef')}: <strong>{n.orderId}</strong>
              </p>
            ) : null}
          </section>
        ) : null}

        {n.type === 'deal' && n.dealEndsAt ? (
          <section className="rxn-detail-section">
            <h3 className="rxn-detail-section-title">{t('notifications.dealEnds')}</h3>
            <DealCountdown endsAt={n.dealEndsAt} />
          </section>
        ) : null}

        {thumbs.length > 1 ? (
          <section className="rxn-detail-section">
            <h3 className="rxn-detail-section-title">{t('notifications.relatedItems')}</h3>
            <div className="rxn-detail-thumb-grid">
              {thumbs.map((src, i) => (
                <img key={i} src={src} alt="" loading="lazy" />
              ))}
            </div>
          </section>
        ) : null}

        {n.createdAt ? (
          <p className="rxn-detail-timestamp">
            {new Date(n.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        ) : null}
      </div>

      <div className="rxn-detail-actions">
        {href && actionLabel ? (
          <button type="button" className="rxn-detail-primary" onClick={onOpen}>
            {actionLabel.replace(/\s*->\s*$/, '')}
            <ChevronRight size={18} strokeWidth={2.25} />
          </button>
        ) : (
          <button type="button" className="rxn-detail-secondary" onClick={onBack}>
            {t('notifications.backToList')}
          </button>
        )}
        <Link
          to="/account?tab=settings&section=notifications"
          className="rxn-detail-settings-link"
          onClick={onBack}
        >
          {t('notifications.settings')}
        </Link>
      </div>
    </motion.div>
  );
}
