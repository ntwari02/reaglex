import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useNotificationHub } from './useNotificationHub';
import { filterNotifications, groupByTimeline, TIMELINE_ORDER } from './normalize';
import { DRAWER_FILTER_TABS } from './types';
import type { NormalizedNotification } from './types';
import NotificationCard from './NotificationCard';

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  placement?: 'drawer' | 'popover';
};

function resolveHref(n: NormalizedNotification): string | undefined {
  if (n.type === 'order' && n.orderId) return `/track/${n.orderId}`;
  if (n.type === 'message' && n.threadId) return '/account';
  if (n.variant === 'flash_sale' || n.variant === 'deal') return '/search?sort=discount';
  if (n.variant === 'live') return '/search';
  if (n.variant === 'ai') return '/search';
  if (n.variant === 'security') return '/account?tab=settings';
  if (n.variant === 'escrow') return '/buyer-protection';
  return undefined;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  onUnreadChange,
  placement = 'drawer',
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hub = useNotificationHub({ enabled: isOpen });
  const {
    items,
    loading,
    loaded,
    activeFilter,
    setFilter,
    drawerScrollTop,
    setDrawerScroll,
    markRead,
    markAllRead,
    unreadCount,
    hydrate,
  } = hub;

  const filtered = filterNotifications(items, activeFilter);
  const grouped = groupByTimeline(filtered);

  const tabCounts = {
    all: items.length,
    orders: items.filter((n) =>
      ['order_confirmed', 'shipping', 'out_for_delivery', 'delivered'].includes(n.variant),
    ).length,
    deals: items.filter((n) => ['flash_sale', 'deal', 'upcoming'].includes(n.variant)).length,
    live: items.filter((n) => n.variant === 'live').length,
    ai: items.filter((n) => n.variant === 'ai').length,
  };

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const el = scrollRef.current;
    if (el && drawerScrollTop > 0) el.scrollTop = drawerScrollTop;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, drawerScrollTop]);

  const handleScroll = () => {
    if (scrollRef.current) setDrawerScroll(scrollRef.current.scrollTop);
  };

  const handleOpen = (n: NormalizedNotification) => {
    markRead(n.id, n);
    const href = resolveHref(n);
    onClose();
    if (href) navigate(href);
  };

  const showInitialLoad = loading && !loaded && items.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="rnx-root">
          <motion.div
            className="rnx-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={`rnx-panel rnx-panel--${placement}`}
            initial={{ opacity: 0, y: placement === 'drawer' ? 24 : -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'drawer' ? 16 : -4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            role="dialog"
            aria-label={t('nav.notifications')}
          >
            <header className="rnx-head">
              <div className="rnx-head-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 className="rnx-title">{t('nav.notifications')}</h2>
                  {unreadCount > 0 && (
                    <span className="rnx-badge-new">
                      {unreadCount} {t('notifications.new')}
                    </span>
                  )}
                </div>
                <div className="rnx-head-actions">
                  {unreadCount > 0 && (
                    <button type="button" className="rnx-text-btn" onClick={markAllRead}>
                      {t('notifications.markAllRead')}
                    </button>
                  )}
                  <Link
                    to="/account?tab=settings&section=notifications"
                    className="rnx-icon-btn"
                    onClick={onClose}
                    title={t('notifications.settings')}
                  >
                    <Settings size={16} />
                  </Link>
                </div>
              </div>
            </header>

            <div className="rnx-filters">
              {DRAWER_FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rnx-chip${activeFilter === tab.id ? ' is-active' : ''}`}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                  {tabCounts[tab.id as keyof typeof tabCounts] > 0 && (
                    <span className="rnx-chip-count">{tabCounts[tab.id as keyof typeof tabCounts]}</span>
                  )}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="rnx-scroll" onScroll={handleScroll}>
              {showInitialLoad ? (
                <>
                  <div className="rnx-loading-line" />
                  <div className="rnx-loading-line" />
                  <div className="rnx-loading-line" />
                </>
              ) : filtered.length === 0 ? (
                <div className="rnx-empty">
                  <p className="rnx-empty-title">{t('notifications.allCaughtUp')}</p>
                  <p className="rnx-empty-sub">{t('notifications.noNew')}</p>
                  <button
                    type="button"
                    className="rnx-text-btn"
                    style={{ marginTop: 12 }}
                    onClick={() => hydrate(true)}
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                TIMELINE_ORDER.map((group) => {
                  const rows = grouped[group] || [];
                  if (!rows.length) return null;
                  const label =
                    group === 'NOW'
                      ? 'Now'
                      : group === 'TODAY'
                        ? 'Today'
                        : group === 'LIVE_EVENTS'
                          ? 'Live Events'
                          : group === 'PROMOTIONS'
                            ? 'Promotions'
                            : group === 'THIS_WEEK'
                              ? 'This Week'
                              : 'Earlier';
                  return (
                    <section key={group}>
                      <div className="rnx-section-label">{label}</div>
                      {rows.map((n) => (
                        <NotificationCard
                          key={n.id}
                          item={n}
                          onPress={() => handleOpen(n)}
                        />
                      ))}
                    </section>
                  );
                })
              )}
            </div>

            <footer className="rnx-foot">
              <span>
                {t('notifications.showing')} {filtered.length} / {items.length}
              </span>
              <Link to="/notifications" className="rnx-foot-link" onClick={onClose}>
                {t('notifications.viewAll')} →
              </Link>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
