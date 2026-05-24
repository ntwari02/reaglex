import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerNotificationsApi } from '@/services/sellerNotificationsApi';
import { useAuthStore } from '@/stores/authStore';
import { enrichSellerNotification } from '@/lib/sellerNotificationPresentation';
import SellerNotificationCard from '@/components/seller/SellerNotificationCard';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'returns', label: 'Returns' },
  { id: 'finance', label: 'Finance' },
];

const CATEGORY_GROUPS: Record<string, string[]> = {
  orders: ['new_order'],
  shipping: ['shipping_delay', 'shipping_soon'],
  returns: ['return_opened', 'dispute_opened'],
  finance: ['payout_received', 'funds_released', 'order_refunded'],
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id || '');
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    return sellerNotificationsApi
      .getNotifications(100)
      .then((data) => {
        const rows = Array.isArray(data?.notifications) ? data.notifications : [];
        setNotifications(rows.map((n) => enrichSellerNotification(n, userId)));
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    const cats = CATEGORY_GROUPS[activeFilter] || [];
    return notifications.filter((n) => cats.includes(n.category));
  }, [activeFilter, notifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    void sellerNotificationsApi.markAsRead(id).catch(() => null);
  };

  const openNotification = (id: string) => {
    const row = notifications.find((n) => n.id === id);
    markAsRead(id);
    if (row?.actionLink) navigate(row.actionLink);
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter((n) => n.unread).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    void Promise.all(unreadIds.map((id) => sellerNotificationsApi.markAsRead(id).catch(() => null)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-semibold rounded-lg"
              style={{ color: 'var(--brand-primary)' }}
            >
              Mark all read
            </button>
          )}
          <Link
            to="/seller/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map((filter) => {
          const count =
            filter.id === 'all'
              ? unreadCount
              : notifications.filter(
                  (n) => (CATEGORY_GROUPS[filter.id] || []).includes(n.category) && n.unread,
                ).length;
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className="rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap"
              style={{
                background: isActive ? 'var(--brand-tint)' : 'var(--bg-secondary)',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'var(--brand-border-subtle)' : 'var(--border-card)'}`,
              }}
            >
              {filter.label}
              {count > 0 ? ` · ${count}` : ''}
            </button>
          );
        })}
      </div>

      <div
        className="rounded-2xl border p-4 md:p-6"
        style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}
      >
        {loading ? (
          <p className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading notifications…
          </p>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="sln-feed">
            {filteredNotifications.map((notification, index) => (
              <SellerNotificationCard
                key={notification.id}
                notification={notification}
                onOpen={openNotification}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
