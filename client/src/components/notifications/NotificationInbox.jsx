import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { getNotificationHref } from '../../lib/notificationPresentation';
import NotificationList from './NotificationList';
import NotificationDetailPanel from './NotificationDetailPanel';

/**
 * List + detail stack: tap a row to read more, then use primary action to navigate.
 */
export default function NotificationInbox({
  feed,
  enableSwipe = true,
  compact = false,
  showFooter = true,
  showPushBanner = true,
  onClose,
  onLoadOlder,
  closeOnNavigate = true,
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleSelect = useCallback(
    (n) => {
      feed.markAsRead?.(n.id, n);
      setSelected(n);
    },
    [feed],
  );

  const handleOpen = useCallback(() => {
    if (!selected) return;
    const href = getNotificationHref(selected);
    setSelected(null);
    if (closeOnNavigate) onClose?.();
    if (href) navigate(href);
    else if (!compact) navigate('/notifications');
  }, [selected, closeOnNavigate, onClose, compact, navigate]);

  const handleDelete = useCallback(
    (id) => {
      feed.removeNotification?.(id);
      if (selected?.id === id) setSelected(null);
    },
    [feed, selected],
  );

  return (
    <div className={`rxn-inbox${compact ? ' rxn-inbox--compact' : ''}`}>
      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <NotificationDetailPanel
            key={`detail-${selected.id}`}
            notification={selected}
            compact={compact}
            onBack={() => setSelected(null)}
            onOpen={handleOpen}
            onDelete={feed.removeNotification ? handleDelete : undefined}
          />
        ) : (
          <NotificationList
            key="list"
            {...feed}
            enableSwipe={enableSwipe}
            compact={compact}
            showFooter={showFooter}
            showPushBanner={showPushBanner}
            onItemPress={handleSelect}
            onMarkRead={feed.markAsRead}
            onDelete={handleDelete}
            onClose={onClose}
            onLoadOlder={onLoadOlder}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
