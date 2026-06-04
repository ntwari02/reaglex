import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileNotificationSheet from './notifications/MobileNotificationSheet';
import { useNotificationFeed } from './notifications/useNotificationFeed';
import NotificationInbox from './notifications/NotificationInbox';
import '../styles/notifications-os.css';

const EASE = [0.22, 1, 0.36, 1];

export function NotificationsDropdown({ isOpen, onClose, onUnreadChange }) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <MobileNotificationSheet
        isOpen={isOpen}
        onClose={onClose}
        onUnreadChange={onUnreadChange}
      />
    );
  }

  return (
    <DesktopNotificationsDropdown
      isOpen={isOpen}
      onClose={onClose}
      onUnreadChange={onUnreadChange}
      t={t}
    />
  );
}

function DesktopNotificationsDropdown({ isOpen, onClose, onUnreadChange, t }) {
  const feed = useNotificationFeed({ enabled: isOpen, limit: 30 });

  useEffect(() => {
    onUnreadChange?.(feed.unreadCount);
  }, [feed.unreadCount, onUnreadChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close notifications"
            className="hidden md:block fixed inset-0 z-[198]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="rxn-dropdown-panel hidden md:flex"
          >
            <header className="rxn-sheet-header" style={{ paddingBottom: 8 }}>
              <div className="rxn-sheet-header-left">
                <span className="rxn-sheet-icon">
                  <Bell size={20} strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="rxn-sheet-title">{t('nav.notifications')}</h3>
                  <p className="rxn-sheet-sub">
                    {feed.unreadCount > 0
                      ? `${feed.unreadCount} ${t('notifications.new')}`
                      : t('notifications.noNew')}
                  </p>
                </div>
              </div>
            </header>
            <NotificationInbox
              feed={feed}
              enableSwipe={false}
              compact
              showFooter
              showPushBanner={false}
              onClose={onClose}
              closeOnNavigate
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default NotificationsDropdown;
