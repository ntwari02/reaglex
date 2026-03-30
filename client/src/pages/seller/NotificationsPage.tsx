import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Store,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerNotificationsApi } from '@/services/sellerNotificationsApi';

interface Notification {
  id: string;
  _id?: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'policy_update' | 'system_announcement';
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionLink?: string;
  actionLabel?: string | null;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const filters: Array<{ id: string; label: string; icon: typeof Bell }> = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'success', label: 'Success', icon: CheckCircle2 },
    { id: 'warning', label: 'Warnings', icon: AlertTriangle },
    { id: 'error', label: 'Errors', icon: AlertTriangle },
    { id: 'system_announcement', label: 'Announcements', icon: FileText },
    { id: 'policy_update', label: 'Policy', icon: Store },
  ];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    sellerNotificationsApi
      .getNotifications(100)
      .then((data) => {
        if (!mounted) return;
        const rows = Array.isArray(data?.notifications) ? data.notifications : [];
        const mapped = rows.map((n: any) => ({
          ...n,
          id: String(n._id || n.id),
          unread: !Array.isArray(n.readBy) || !n.readBy.length,
          actionLink: n.actionUrl,
          actionLabel: n.actionText || 'Open',
        }));
        setNotifications(mapped);
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredNotifications = useMemo(
    () =>
      activeFilter === 'all'
        ? notifications
        : notifications.filter((n) => n.type === activeFilter),
    [activeFilter, notifications],
  );

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filteredUnreadCount = filteredNotifications.filter((n) => n.unread).length;

  const getMeta = (type: Notification['type']) => {
    if (type === 'warning' || type === 'error') {
      return {
        icon: AlertTriangle,
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
      };
    }
    if (type === 'success') {
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      };
    }
    if (type === 'policy_update' || type === 'system_announcement') {
      return {
        icon: FileText,
        iconBg: 'bg-blue-100 dark:bg-blue-900/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
      };
    }
    return {
      icon: Info,
      iconBg: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-600 dark:text-gray-300',
    };
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter((n) => n.unread).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    void Promise.all(unreadIds.map((id) => sellerNotificationsApi.markAsRead(id).catch(() => null)));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    void sellerNotificationsApi.markAsRead(id).catch(() => null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredUnreadCount > 0 ? `${filteredUnreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            >
              Mark All Read
            </button>
          )}
          <Link
            to="/seller/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const count = filter.id === 'all' 
            ? unreadCount 
            : notifications.filter(n => n.category === filter.id && n.unread).length;
          const isActive = activeFilter === filter.id;
          
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{filter.label}</span>
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-orange-600 dark:bg-orange-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No notifications</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {activeFilter !== 'all' ? `No ${filters.find(f => f.id === activeFilter)?.label.toLowerCase()} notifications` : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              const meta = getMeta(notification.type);
              const Icon = meta.icon;
              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    notification.unread
                      ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  } hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 ${meta.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-orange-300 dark:border-orange-700`}>
                      <Icon className={`h-6 w-6 ${meta.iconColor}`} strokeWidth={2} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={`font-bold text-base ${
                          notification.unread 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h4>
                        {notification.unread && (
                          <div className="w-3 h-3 bg-orange-600 dark:bg-orange-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                          {formatDate(notification.createdAt)}
                        </p>
                        {notification.actionLink && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(notification.actionLink);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          >
                            {notification.actionLabel || 'Open'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

