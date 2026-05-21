import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import NotificationRow from './NotificationRow';

const TABS = [
  { id: 'all', labelKey: 'notifications.filters.all' },
  { id: 'unread', labelKey: 'notifications.filters.unread' },
  { id: 'orders', labelKey: 'notifications.filters.orders' },
  { id: 'deals', labelKey: 'notifications.filters.deals' },
  { id: 'messages', labelKey: 'notifications.filters.messages' },
  { id: 'system', labelKey: 'notifications.filters.system' },
];

export default function NotificationList({
  filtered,
  loading,
  activeTab,
  setActiveTab,
  tabCounts,
  unreadCount,
  markAllRead,
  onItemPress,
  onMarkRead,
  onDelete,
  enableSwipe = true,
  compact = false,
  showFooter = true,
  onClose,
}) {
  const { t } = useTranslation();
  const tabIndex = TABS.findIndex((tab) => tab.id === activeTab);

  return (
    <div className={`rxn-list${compact ? ' rxn-list--compact' : ''}`}>
      <div className="rxn-list-toolbar">
        <div className="rxn-list-toolbar-left">
          {unreadCount > 0 && (
            <span className="rxn-pill-count">
              {unreadCount} {t('notifications.new')}
            </span>
          )}
        </div>
        <div className="rxn-list-toolbar-right">
          {unreadCount > 0 && (
            <button type="button" className="rxn-text-btn" onClick={markAllRead}>
              <CheckCheck size={16} strokeWidth={1.75} />
              {t('notifications.markAllRead')}
            </button>
          )}
          <Link
            to="/account?tab=settings&section=notifications"
            className="rxn-icon-btn"
            onClick={onClose}
            aria-label={t('notifications.settings')}
          >
            <Settings size={18} strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      <div className="rxn-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rxn-tab${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(tab.labelKey)}
            {tabCounts[tab.id] > 0 && (
              <span className="rxn-tab-count">{tabCounts[tab.id]}</span>
            )}
          </button>
        ))}
        <motion.span
          className="rxn-tab-indicator"
          layout
          style={{ width: `${100 / TABS.length}%` }}
          animate={{ x: `${tabIndex * 100}%` }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        />
      </div>

      <div className="rxn-list-scroll">
        {loading ? (
          <div className="rxn-skeleton-stack">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rxn-skeleton-row" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rxn-empty">
            <span className="rxn-empty-icon">
              <Bell size={32} strokeWidth={1.5} />
            </span>
            <p className="rxn-empty-title">{t('notifications.allCaughtUp')}</p>
            <p className="rxn-empty-sub">{t('notifications.noNew')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onPress={onItemPress}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
                enableSwipe={enableSwipe}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {showFooter && (
        <div className="rxn-list-footer">
          <span className="rxn-footer-meta">
            {t('notifications.showing')} {filtered.length}
          </span>
          <Link to="/notifications" className="rxn-footer-link" onClick={onClose}>
            {t('notifications.viewAll')} →
          </Link>
        </div>
      )}
    </div>
  );
}
