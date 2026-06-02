import { useEffect } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import OverlayPortal from '../OverlayPortal';
import { useNotificationFeed } from './useNotificationFeed';
import NotificationInbox from './NotificationInbox';

const EASE = [0.22, 1, 0.36, 1];

export default function MobileNotificationSheet({ isOpen, onClose, onUnreadChange }) {
  const { t } = useTranslation();
  const dragControls = useDragControls();

  const feed = useNotificationFeed({ enabled: isOpen, limit: 40 });

  useEffect(() => {
    onUnreadChange?.(feed.unreadCount);
  }, [feed.unreadCount, onUnreadChange]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.documentElement.classList.add('rx-notif-sheet-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('rx-notif-sheet-open');
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  return (
    <OverlayPortal active={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <div className="rxn-sheet-root md:hidden" role="dialog" aria-modal="true" aria-label={t('nav.notifications')}>
          <motion.button
            type="button"
            className="rxn-sheet-backdrop"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            onClick={onClose}
          />

          <motion.section
            className="rxn-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: EASE }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) onClose();
            }}
          >
            <div
              className="rxn-sheet-grabber-wrap"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <span className="rxn-sheet-grabber" />
            </div>

            <header className="rxn-sheet-header">
              <div className="rxn-sheet-header-left">
                <span className="rxn-sheet-icon">
                  <Bell size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="rxn-sheet-title">{t('nav.notifications')}</h2>
                  <p className="rxn-sheet-sub">
                    {feed.unreadCount > 0
                      ? `${feed.unreadCount} ${t('notifications.new')}`
                      : t('notifications.noNew')}
                  </p>
                </div>
              </div>
              <button type="button" className="rxn-sheet-close" onClick={onClose} aria-label="Close">
                <X size={20} strokeWidth={1.85} />
              </button>
            </header>

            <NotificationInbox
              feed={feed}
              compact
              enableSwipe
              showFooter
              showPushBanner
              onClose={onClose}
              closeOnNavigate
            />
          </motion.section>
          </div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}
