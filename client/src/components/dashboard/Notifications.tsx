import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, FileText, AlertTriangle, X, Settings, ExternalLink, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { systemInboxApi, type SystemInboxRow } from '@/services/systemInboxApi';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterId = 'all' | 'unread' | 'announcement' | 'alert';

function categoryForType(type: string): 'announcement' | 'alert' {
  if (type === 'warning' || type === 'error') return 'alert';
  return 'announcement';
}

function priorityUi(p: string): 'high' | 'medium' | 'low' {
  if (p === 'urgent' || p === 'high') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id || '');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [rows, setRows] = useState<SystemInboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnread = useCallback(
    (n: SystemInboxRow) => {
      if (!userId) return true;
      const rb = n.readBy || [];
      return !rb.some((id) => String(id) === String(userId));
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { notifications } = await systemInboxApi.list(50, false);
      setRows(Array.isArray(notifications) ? notifications : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load notifications');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      refresh();
    }
  }, [isOpen, userId, refresh]);

  const mapped = rows.map((n) => ({
    raw: n,
    id: String(n._id),
    title: n.title || 'Notice',
    message: n.message || '',
    date: n.createdAt ? new Date(n.createdAt).toLocaleString() : '',
    unread: isUnread(n),
    category: categoryForType(n.type || ''),
    priority: priorityUi(n.priority || 'medium'),
    actionLink: n.actionUrl,
    actionLabel: n.actionText || (n.actionUrl ? 'Open' : undefined),
  }));

  const filtered =
    activeFilter === 'all'
      ? mapped
      : activeFilter === 'unread'
        ? mapped.filter((m) => m.unread)
        : activeFilter === 'announcement'
          ? mapped.filter((m) => m.category === 'announcement')
          : mapped.filter((m) => m.category === 'alert');

  const unreadCount = mapped.filter((m) => m.unread).length;
  const filteredUnreadCount = filtered.filter((m) => m.unread).length;

  const markOneServer = async (id: string) => {
    try {
      await systemInboxApi.markRead(id);
      window.dispatchEvent(new Event('systemInboxUnreadRefresh'));
    } catch {
      /* ignore */
    }
  };

  const markAsRead = (id: string) => {
    setRows((prev) =>
      prev.map((n) =>
        String(n._id) === id
          ? { ...n, readBy: [...(n.readBy || []).filter((x) => String(x) !== userId), userId] }
          : n,
      ),
    );
    void markOneServer(id);
  };

  const markAllAsRead = async () => {
    const ids = mapped.filter((m) => m.unread).map((m) => m.id);
    for (const id of ids) {
      await markOneServer(id);
    }
    setRows((prev) =>
      prev.map((n) => ({
        ...n,
        readBy: Array.from(new Set([...(n.readBy || []).map(String), userId])),
      })),
    );
  };

  const getNotificationsUrl = () => {
    if (location.pathname.startsWith('/admin')) return '/admin/notifications';
    if (location.pathname.startsWith('/seller')) return '/seller/notifications';
    return '/notifications';
  };

  const getSettingsUrl = () => {
    if (location.pathname.startsWith('/admin')) return '/admin/settings';
    if (location.pathname.startsWith('/seller')) return '/seller/settings';
    return '/profile';
  };

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'announcement', label: 'Updates' },
    { id: 'alert', label: 'Alerts' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your inbox</h2>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Close notifications"
                    >
                      <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredUnreadCount > 0 ? `${filteredUnreadCount} unread` : 'All caught up'} · Your personal
                    inbox (orders, support, broadcasts). Admin Notification Center is under the main menu.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllAsRead()}
                    className="px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {filters.map((filter) => {
                  const count =
                    filter.id === 'all'
                      ? unreadCount
                      : filter.id === 'unread'
                    ? unreadCount 
                        : mapped.filter((m) => m.category === filter.id && m.unread).length;
                  const isActive = activeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{filter.label}</span>
                      {count > 0 && filter.id !== 'all' && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          isActive
                            ? 'bg-orange-600 dark:bg-orange-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4 bg-gray-50 dark:bg-gray-900">
              {!userId && (
                <p className="text-sm text-center text-gray-500 py-8">Sign in to see notifications.</p>
              )}
              {userId && loading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              )}
              {userId && error && !loading && (
                <p className="text-sm text-center text-red-600 dark:text-red-400 py-8">{error}</p>
              )}
              {userId && !loading && !error && filtered.length === 0 && (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                </div>
              )}
              {userId && !loading && !error && filtered.length > 0 && (
                <div className="space-y-3">
                  {filtered.map((notification, index) => {
                    const Icon = notification.category === 'alert' ? AlertTriangle : FileText;
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`group relative p-4 rounded-lg bg-white dark:bg-gray-800 border-2 transition-all cursor-pointer ${
                          notification.unread
                            ? 'border-orange-200 dark:border-orange-800 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700'
                        } hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700`}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.actionLink) onClose();
                        }}
                      >
                        {notification.priority === 'high' && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border-2 ${
                              notification.category === 'alert'
                                ? 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                : 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                notification.category === 'alert'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                              strokeWidth={2}
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4
                                className={`font-bold text-sm ${
                                notification.unread 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {notification.title}
                              </h4>
                              {notification.unread && (
                                <div className="w-2.5 h-2.5 bg-orange-600 dark:bg-orange-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500 font-medium">{notification.date}</p>
                              {notification.actionLink && notification.actionLabel && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void markOneServer(notification.id);
                                    onClose();
                                    navigate(notification.actionLink!);
                                  }}
                                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 transition-colors"
                                >
                                  {notification.actionLabel}
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <Link
                to={getNotificationsUrl()}
                onClick={onClose}
                className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 transition-colors"
              >
                View all
              </Link>
              <Link
                to={getSettingsUrl()}
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Notifications;
