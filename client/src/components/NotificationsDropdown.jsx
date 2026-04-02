import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { buyerNotificationsApi } from '../services/buyerNotificationsApi';

const PRIMARY = '#f97316';
const EASE = [0.25, 0.46, 0.45, 0.94];

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'deals', label: 'Deals' },
  { id: 'system', label: 'System' },
];

const TYPE_CONFIG = {
  order: { icon: '📦', circleBg: PRIMARY, label: 'Track Order →', linkColor: PRIMARY },
  deal: { icon: '🏷️', circleBg: '#10b981', label: 'Shop Now →', linkColor: '#10b981' },
  system: { icon: '👋', circleBg: '#2563eb', label: 'Complete Profile →', linkColor: '#2563eb' },
  message: { icon: '💬', circleBg: '#8b5cf6', label: 'Reply →', linkColor: '#8b5cf6' },
  review: { icon: '⭐', circleBg: '#eab308', label: 'Rate now', linkColor: '#eab308' },
};

export function NotificationsDropdown({ isOpen, onClose, onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const tabCounts = {
    all: notifications.length,
    unread: unreadCount,
    orders: notifications.filter((n) => n.type === 'order').length,
    deals: notifications.filter((n) => n.type === 'deal').length,
    system: notifications.filter((n) => n.type === 'system').length,
  };
  const filtered =
    activeTab === 'all'
      ? notifications
      : activeTab === 'unread'
        ? notifications.filter((n) => n.unread)
        : notifications.filter(
            (n) =>
              (activeTab === 'orders' && n.type === 'order') ||
              (activeTab === 'deals' && n.type === 'deal') ||
              (activeTab === 'system' && n.type === 'system')
          );

  const markAsRead = useCallback((id, row) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    if (row?.type === 'system' && typeof id === 'string' && id.startsWith('system:')) {
      buyerNotificationsApi.markSystemNotificationRead(id).catch(() => {});
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      prev.filter((n) => n.unread && n.type === 'system' && String(n.id).startsWith('system:')).forEach((n) => {
        buyerNotificationsApi.markSystemNotificationRead(n.id).catch(() => {});
      });
      return prev.map((n) => ({ ...n, unread: false }));
    });
  }, []);

  const deleteNotification = useCallback((id) => {
    setDeletingId(id);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setDeletingId(null);
    }, 250);
  }, []);

  const handleItemClick = useCallback((n) => {
    markAsRead(n.id, n);
    onClose();
  }, [markAsRead, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    buyerNotificationsApi
      .getNotifications(30)
      .then((data) => {
        if (!mounted) return;
        const rows = Array.isArray(data?.notifications) ? data.notifications : [];
        setNotifications(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setNotifications([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const tabIndex = TABS.findIndex((t) => t.id === activeTab);

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[199]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] flex flex-col rounded-[20px] overflow-hidden z-[200]"
            style={{
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              background: 'var(--card-bg)',
              border: '1px solid var(--divider-strong)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Arrow pointer */}
            <div
              className="absolute -top-2 right-6 w-4 h-4 rotate-45 border-l border-t"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--divider-strong)',
              }}
            />

            {/* Header */}
            <div className="flex-shrink-0 px-5 py-4 border-b" style={{ borderColor: '#f4f5f7' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[17px]" style={{ color: '#111827' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: PRIMARY }}>
                      {unreadCount} new
                    </motion.span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead} className="text-[13px] font-medium hover:underline" style={{ color: PRIMARY }}>
                      Mark all read
                    </button>
                  )}
                  <Link to="/account?tab=settings" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition" title="Notification settings">
                    <span className="text-base opacity-70 hover:opacity-100" style={{ filter: 'grayscale(0.5)' }}>⚙️</span>
                  </Link>
                </div>
              </div>
              {/* Tabs */}
              <div className="relative flex border-b border-transparent">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className="flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    style={{ color: activeTab === t.id ? PRIMARY : '#6b7280' }}
                  >
                    {t.label}
                    {tabCounts[t.id] > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-gray-200 text-[10px] font-bold flex items-center justify-center" style={{ color: '#374151' }}>
                        {tabCounts[t.id]}
                      </span>
                    )}
                  </button>
                ))}
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 rounded-full"
                  style={{ background: PRIMARY, width: `${100 / TABS.length}%` }}
                  animate={{ x: `${tabIndex * 100}%` }}
                  transition={{ duration: 0.25, ease: EASE }}
                />
              </div>
            </div>

            {/* List */}
            <div className="notif-list-scroll flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 380 }}>
              {loading ? (
                <div className="py-6 px-6 text-sm" style={{ color: '#6b7280' }}>Loading notifications...</div>
              ) : filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 px-6" style={{ minHeight: 200 }}>
                  <motion.span className="text-4xl mb-3 notif-empty-bell-swing inline-block">🔔</motion.span>
                  <p className="font-bold text-base" style={{ color: '#111827' }}>All caught up! 🎉</p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#6b7280' }}>No new notifications</p>
                </motion.div>
              ) : (
                <div className="py-1" onClick={() => setMenuOpenId(null)} role="presentation">
                  <AnimatePresence>
                    {filtered.map((n) => {
                      const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                      const isDeleting = deletingId === n.id;
                      return (
                        <motion.div
                          key={n.id}
                          layout
                          initial={isDeleting ? {} : { opacity: 0, y: -8 }}
                          animate={isDeleting ? { opacity: 0, x: 80 } : { opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 80 }}
                          transition={{ duration: 0.25 }}
                          onClick={() => handleItemClick(n)}
                          onMouseEnter={() => setHoveredId(n.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 border-l-[3px] ${n.unread ? 'bg-[#fff7ed]' : 'bg-white hover:bg-[#f9fafb]'}`}
                          style={{ borderLeftColor: n.unread ? PRIMARY : 'transparent' }}
                        >
                          <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: config.circleBg }}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm" style={{ color: '#111827' }}>{n.title}</p>
                            <p className="text-[13px] line-clamp-2 mt-0.5" style={{ color: '#6b7280' }}>{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px]" style={{ color: '#9ca3af' }} title={n.time}>{n.time}</span>
                              {n.orderId && (
                                <Link to={`/track/${n.orderId}`} onClick={(e) => e.stopPropagation()} className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: '#fff7ed', color: PRIMARY }}>
                                  {n.orderId}
                                </Link>
                              )}
                            </div>
                            {(config.label && (n.type === 'order' || n.type === 'deal' || n.type === 'system' || n.type === 'message')) && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleItemClick(n); }} className="text-xs font-semibold mt-1 hover:underline" style={{ color: config.linkColor }}>
                                {config.label}
                              </button>
                            )}
                            {n.type === 'review' && (
                              <div className="flex gap-0.5 mt-1" onClick={(e) => e.stopPropagation()}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} type="button" className="text-sm hover:scale-110 transition-transform">⭐</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 relative">
                            {n.unread && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                            {(hoveredId === n.id || menuOpenId === n.id) && (
                              <>
                                <motion.button
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === n.id ? null : n.id); }}
                                  className="p-1 rounded hover:bg-gray-200"
                                >
                                  <MoreVertical className="w-4 h-4" style={{ color: '#6b7280' }} />
                                </motion.button>
                                {menuOpenId === n.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute right-0 top-full mt-1 py-1 w-44 rounded-lg bg-white border border-gray-200 shadow-lg z-10"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button type="button" onClick={() => { markAsRead(n.id, n); setMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                      Mark as read
                                    </button>
                                    <button type="button" onClick={() => { deleteNotification(n.id); setMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                      Delete notification
                                    </button>
                                    <button type="button" onClick={() => setMenuOpenId(null)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                      Mute this type
                                    </button>
                                  </motion.div>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: '#f4f5f7', background: '#fafafa', borderRadius: '0 0 20px 20px' }}>
              <span className="text-xs" style={{ color: '#9ca3af' }}>Showing {filtered.length} of {notifications.length} notifications</span>
              <Link to="/notifications" onClick={onClose} className="text-xs font-semibold flex items-center gap-0.5 hover:gap-1 transition-all" style={{ color: PRIMARY }}>
                View All Notifications →
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default NotificationsDropdown;
