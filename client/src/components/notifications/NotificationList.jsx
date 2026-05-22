import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, ChevronDown, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import NotificationRow from './NotificationRow';
import NotificationPushBanner from './NotificationPushBanner';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'deals', label: 'Deals' },
  { id: 'system', label: 'System' },
  { id: 'ai', label: 'AI' },
];

function groupByDay(items) {
  const today = [];
  const earlier = [];
  for (const n of items) {
    const t = String(n.time || '').toLowerCase();
    if (t.includes('m ago') || t.includes('h ago') || t === 'just now' || t.includes('min')) {
      today.push(n);
    } else {
      earlier.push(n);
    }
  }
  return { today, earlier };
}

export default function NotificationList({
  filtered,
  notifications,
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
  showPushBanner = true,
  onLoadOlder,
}) {
  const { t } = useTranslation();
  const { today, earlier } = useMemo(() => groupByDay(filtered), [filtered]);
  const total = notifications?.length ?? filtered.length;

  const renderGroup = (label, items) => {
    if (!items.length) return null;
    return (
      <div className="rxn-day-group">
        <h3 className="rxn-day-label">{label}</h3>
        {items.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            onPress={onItemPress}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
            enableSwipe={enableSwipe}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`rxn-list rxn-list--premium${compact ? ' rxn-list--compact' : ''}`}>
      {!compact && (
        <div className="rxn-list-toolbar rxn-list-toolbar--page">
          <div className="rxn-list-toolbar-left">
            {unreadCount > 0 && (
              <button type="button" className="rxn-text-btn" onClick={markAllRead}>
                <CheckCheck size={16} strokeWidth={1.75} />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="rxn-list-toolbar-right">
            <button type="button" className="rxn-icon-btn" aria-label="Search notifications">
              <Search size={17} strokeWidth={1.75} />
            </button>
            <Link
              to="/account?tab=settings&section=notifications"
              className="rxn-icon-btn"
              onClick={onClose}
              aria-label={t('notifications.settings')}
            >
              <SlidersHorizontal size={17} strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      )}

      {compact && unreadCount > 0 && (
        <div className="rxn-list-toolbar">
          <span className="rxn-pill-count">
            {unreadCount} {t('notifications.new')}
          </span>
          <button type="button" className="rxn-text-btn" onClick={markAllRead}>
            <CheckCheck size={16} strokeWidth={1.75} />
            {t('notifications.markAllRead')}
          </button>
        </div>
      )}

      <div className="rxn-tabs rxn-tabs--premium" role="tablist" aria-label="Filter notifications">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rxn-tab${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {(tabCounts[tab.id] ?? 0) > 0 && (
              <span className="rxn-tab-count">{tabCounts[tab.id]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="rxn-list-scroll">
        {showPushBanner && <NotificationPushBanner />}

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
            {renderGroup('Today', today)}
            {renderGroup('Earlier', earlier)}
          </AnimatePresence>
        )}
      </div>

      {showFooter && (
        <div className="rxn-list-footer rxn-list-footer--premium">
          <Link
            to="/account?tab=settings&section=notifications"
            className="rxn-footer-icon-btn"
            aria-label="Notification settings"
            onClick={onClose}
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </Link>
          <span className="rxn-footer-meta">
            Showing {filtered.length} of {total}
          </span>
          {onLoadOlder ? (
            <button type="button" className="rxn-footer-load" onClick={onLoadOlder}>
              Load older
              <ChevronDown size={14} />
            </button>
          ) : (
            <Link to="/notifications" className="rxn-footer-load" onClick={onClose}>
              {t('notifications.viewAll')}
              <ChevronDown size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
