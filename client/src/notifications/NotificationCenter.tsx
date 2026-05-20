import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ListChecks,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useNotificationHub } from './useNotificationHub';
import { filterNotifications, groupByTimeline } from './normalize';
import { CENTER_FILTER_TABS } from './types';
import type { NormalizedNotification, TimelineGroup } from './types';
import NotificationCenterCard from './NotificationCenterCard';

function resolveHref(n: NormalizedNotification): string | undefined {
  if (n.type === 'order' && n.orderId) return `/track/${n.orderId}`;
  if (n.type === 'message') return '/account';
  if (n.variant === 'flash_sale' || n.variant === 'deal') return '/search?sort=discount';
  if (n.variant === 'ai') return '/search';
  if (n.variant === 'security') return '/account?tab=settings';
  return undefined;
}

/** Collapse hub groups into mockup sections: Today + Earlier */
function centerSectionGroups(
  grouped: Record<TimelineGroup, NormalizedNotification[]>,
): { today: NormalizedNotification[]; earlier: NormalizedNotification[] } {
  const today: NormalizedNotification[] = [];
  const earlier: NormalizedNotification[] = [];
  const todayKeys: TimelineGroup[] = ['NOW', 'TODAY', 'LIVE_EVENTS', 'PROMOTIONS'];
  const earlierKeys: TimelineGroup[] = ['THIS_WEEK', 'EARLIER'];

  for (const k of todayKeys) today.push(...(grouped[k] || []));
  for (const k of earlierKeys) earlier.push(...(grouped[k] || []));

  return { today, earlier };
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hub = useNotificationHub({ enabled: true });
  const {
    items,
    loading,
    loaded,
    activeFilter,
    setFilter,
    searchQuery,
    setSearch,
    centerScrollTop,
    setCenterScroll,
    markRead,
    markAllRead,
    remove,
    unreadCount,
  } = hub;

  const [pushDismissed, setPushDismissed] = useState(
    () => sessionStorage.getItem('rnx-push-dismissed') === '1',
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = filterNotifications(items, activeFilter, searchQuery);
  const grouped = groupByTimeline(filtered);
  const { today, earlier } = centerSectionGroups(grouped);

  const tabCounts: Record<string, number> = {
    all: items.length,
    orders: items.filter((n) =>
      ['order_confirmed', 'shipping', 'out_for_delivery', 'delivered'].includes(n.variant),
    ).length,
    deals: items.filter((n) => ['flash_sale', 'deal', 'upcoming'].includes(n.variant)).length,
    system: items.filter((n) => ['system', 'escrow', 'security'].includes(n.variant)).length,
    ai: items.filter((n) => n.variant === 'ai').length,
  };

  const visibleLimit = page * 24;
  const todayVisible = today.slice(0, visibleLimit);
  const earlierVisible = earlier.slice(0, Math.max(0, visibleLimit - todayVisible.length));
  const totalVisible = todayVisible.length + earlierVisible.length;
  const hasMore = filtered.length > totalVisible;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && centerScrollTop > 0) el.scrollTop = centerScrollTop;
  }, [centerScrollTop]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleOpen = (n: NormalizedNotification) => {
    markRead(n.id, n);
    const href = resolveHref(n);
    if (href) navigate(href);
  };

  const dismissPush = () => {
    setPushDismissed(true);
    sessionStorage.setItem('rnx-push-dismissed', '1');
  };

  const showLoad = loading && !loaded && items.length === 0;

  return (
    <div className="rnx-root rnx-center rnx-center--mobile">
      <header className="rnx-m-head">
        <div className="rnx-m-head-top">
          <button
            type="button"
            className="rnx-m-back"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className="rnx-m-head-titles">
            <h1 className="rnx-m-page-title">All Notifications</h1>
            <p className="rnx-m-page-sub">Stay updated with everything</p>
          </div>
          <div className="rnx-m-head-icons">
            <button
              type="button"
              className="rnx-m-head-icon"
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search size={20} strokeWidth={2} />
            </button>
            <button type="button" className="rnx-m-head-icon" aria-label="Filters">
              <SlidersHorizontal size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="rnx-m-search-expand">
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              aria-label="Search notifications"
            />
          </div>
        )}

        <div className="rnx-m-filters">
          {CENTER_FILTER_TABS.map((tab) => {
            const count = tabCounts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                type="button"
                className={`rnx-m-chip${activeFilter === tab.id ? ' is-active' : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
                {count > 0 && <span className="rnx-m-chip-count">{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="rnx-m-scroll"
        onScroll={() => {
          if (scrollRef.current) setCenterScroll(scrollRef.current.scrollTop);
        }}
      >
        {!pushDismissed && (
          <div className="rnx-m-push">
            <button type="button" className="rnx-m-push-close" onClick={dismissPush} aria-label="Dismiss">
              <X size={14} />
            </button>
            <div className="rnx-m-push-icon">
              <Bell size={20} strokeWidth={2} />
            </div>
            <div className="rnx-m-push-copy">
              <strong>Enable push notifications</strong>
              <span>Get alerts for orders, deals and live shopping.</span>
            </div>
            <button type="button" className="rnx-m-push-enable" onClick={dismissPush}>
              Enable
            </button>
          </div>
        )}

        {showLoad ? (
          <>
            <div className="rnx-loading-line rnx-m-skel" />
            <div className="rnx-loading-line rnx-m-skel" />
            <div className="rnx-loading-line rnx-m-skel" />
          </>
        ) : filtered.length === 0 ? (
          <div className="rnx-empty">
            <p className="rnx-empty-title">All caught up</p>
            <p className="rnx-empty-sub">No notifications in this filter.</p>
            <Link to="/search" className="rnx-foot-link">
              Browse deals →
            </Link>
          </div>
        ) : (
          <>
            {todayVisible.length > 0 && (
              <section className="rnx-m-section">
                <div className="rnx-m-section-row">
                  <span className="rnx-m-section-title">Today</span>
                  {unreadCount > 0 && (
                    <button type="button" className="rnx-m-mark-all" onClick={markAllRead}>
                      <ListChecks size={14} />
                      Mark all read
                    </button>
                  )}
                </div>
                {todayVisible.map((n) => (
                  <NotificationCenterCard
                    key={n.id}
                    item={n}
                    sectionTone="today"
                    onPress={() => handleOpen(n)}
                  />
                ))}
              </section>
            )}

            {earlierVisible.length > 0 && (
              <section className="rnx-m-section rnx-m-section--earlier">
                <div className="rnx-m-section-row">
                  <span className="rnx-m-section-title">Earlier</span>
                </div>
                {earlierVisible.map((n) => (
                  <NotificationCenterCard
                    key={n.id}
                    item={n}
                    sectionTone="earlier"
                    onPress={() => handleOpen(n)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {!showLoad && filtered.length > 0 && (
        <footer className="rnx-m-footer">
          <button
            type="button"
            className="rnx-m-clear"
            aria-label="Clear all"
            onClick={() => {
              if (window.confirm('Clear all notifications from this view?')) {
                filtered.forEach((n) => remove(n.id));
              }
            }}
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
          <span className="rnx-m-showing">
            Showing {totalVisible} of {filtered.length}
          </span>
          {hasMore ? (
            <button type="button" className="rnx-m-load-older" onClick={() => setPage((p) => p + 1)}>
              Load older
              <ChevronDown size={16} />
            </button>
          ) : (
            <button type="button" className="rnx-m-load-older" disabled>
              Load older
              <ChevronDown size={16} />
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
