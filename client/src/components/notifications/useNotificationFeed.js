import { useCallback, useEffect, useMemo, useState } from 'react';
import { buyerNotificationsApi } from '../../services/buyerNotificationsApi';
import { enrichNotification } from '../../lib/notificationPresentation';

export function useNotificationFeed({ enabled = true, limit = 50 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const refresh = useCallback(() => {
    if (!enabled) return Promise.resolve();
    setLoading(true);
    return buyerNotificationsApi
      .getNotifications(limit)
      .then((data) => {
        const rows = Array.isArray(data?.notifications) ? data.notifications : [];
        setNotifications(rows.map(enrichNotification));
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [enabled, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  const tabCounts = useMemo(
    () => ({
      all: notifications.length,
      unread: unreadCount,
      orders: notifications.filter((n) => n.type === 'order').length,
      deals: notifications.filter((n) => n.type === 'deal').length,
      system: notifications.filter((n) => n.type === 'system').length,
      messages: notifications.filter((n) => n.type === 'message').length,
    }),
    [notifications, unreadCount],
  );

  const filtered = useMemo(() => {
    if (activeTab === 'unread') return notifications.filter((n) => n.unread);
    if (activeTab === 'orders') return notifications.filter((n) => n.type === 'order');
    if (activeTab === 'deals') return notifications.filter((n) => n.type === 'deal');
    if (activeTab === 'system') return notifications.filter((n) => n.type === 'system');
    if (activeTab === 'messages') return notifications.filter((n) => n.type === 'message');
    return notifications;
  }, [notifications, activeTab]);

  const markAsRead = useCallback((id, row) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    if (row?.type === 'system' && typeof id === 'string' && id.startsWith('system:')) {
      buyerNotificationsApi.markSystemNotificationRead(id).catch(() => {});
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      prev
        .filter((n) => n.unread && n.type === 'system' && String(n.id).startsWith('system:'))
        .forEach((n) => buyerNotificationsApi.markSystemNotificationRead(n.id).catch(() => {}));
      return prev.map((n) => ({ ...n, unread: false }));
    });
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    notifications,
    filtered,
    loading,
    activeTab,
    setActiveTab,
    unreadCount,
    tabCounts,
    refresh,
    markAsRead,
    markAllRead,
    removeNotification,
  };
}
