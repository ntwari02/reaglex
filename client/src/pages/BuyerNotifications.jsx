import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, Trash2, Settings, MoreVertical, ChevronDown, ChevronRight, X,
  Package, Tag, MessageSquare, Star, AlertCircle, Search,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { buyerNotificationsApi } from '../services/buyerNotificationsApi';

const PRIMARY = '#f97316';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';
const EASE = [0.25, 0.46, 0.45, 0.94];

const DATE_GROUPS = ['TODAY', 'YESTERDAY', 'THIS WEEK', 'LAST WEEK', 'THIS MONTH', 'EARLIER'];

const TABS = [
  { id: 'all', label: 'All', icon: '🔔' },
  { id: 'unread', label: 'Unread', icon: '📬' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'deals', label: 'Deals', icon: '🏷️' },
  { id: 'system', label: 'System', icon: '⚙️' },
  { id: 'messages', label: 'Messages', icon: '💬' },
];

const TYPE_CONFIG = {
  order: { icon: '📦', label: 'Order Update', color: PRIMARY, bg: 'linear-gradient(135deg,#f97316,#ea580c)' },
  deal: { icon: '🏷️', label: 'Flash Deal', color: '#10b981', bg: 'linear-gradient(135deg,#10b981,#059669)' },
  system: { icon: '👋', label: 'System', color: '#2563eb', bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)' },
  message: { icon: '💬', label: 'Message', color: '#8b5cf6', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  review: { icon: '⭐', label: 'Review Request', color: '#eab308', bg: 'linear-gradient(135deg,#eab308,#ca8a04)' },
  alert: { icon: '⚠️', label: 'Alert', color: ERROR, bg: `linear-gradient(135deg,${ERROR},#dc2626)` },
};

function getDateGroup(createdAt) {
  const d = new Date(createdAt || Date.now());
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startGiven = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((+startToday - +startGiven) / 86400000);
  if (diffDays <= 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  if (diffDays <= 7) return 'THIS WEEK';
  if (diffDays <= 14) return 'LAST WEEK';
  if (diffDays <= 31) return 'THIS MONTH';
  return 'EARLIER';
}

const PER_PAGE = 20;
function useCountdown(endMs) {
  const safeEnd = endMs && endMs > Date.now() ? endMs : null;
  const [left, setLeft] = useState(() => (safeEnd ? Math.max(0, Math.floor((safeEnd - Date.now()) / 1000)) : 0));
  useEffect(() => {
    if (!safeEnd) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, Math.floor((safeEnd - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [safeEnd]);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return { h, m, s, underHour: left < 3600, active: !!safeEnd };
}

export default function BuyerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [markAllDone, setMarkAllDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [deletedId, setDeletedId] = useState(null);
  const [undoId, setUndoId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [dndHours, setDndHours] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filtered = notifications.filter((n) => {
    if (filterTab === 'unread' && !n.unread) return false;
    if (filterTab === 'orders' && n.type !== 'order') return false;
    if (filterTab === 'deals' && n.type !== 'deal') return false;
    if (filterTab === 'system' && n.type !== 'system') return false;
    if (filterTab === 'messages' && n.type !== 'message') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!n.title?.toLowerCase().includes(q) && !n.message?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const byGroup = DATE_GROUPS.reduce((acc, g) => {
    acc[g] = filtered.filter((n) => n.dateGroup === g);
    return acc;
  }, {});

  const tabCounts = {
    all: notifications.length,
    unread: unreadCount,
    orders: notifications.filter((n) => n.type === 'order').length,
    deals: notifications.filter((n) => n.type === 'deal').length,
    system: notifications.filter((n) => n.type === 'system').length,
    messages: notifications.filter((n) => n.type === 'message').length,
  };

  const recentActivity = useMemo(
    () =>
      [...notifications]
        .sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0))
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          text: n.title || 'Notification',
          time: n.time || '',
        })),
    [notifications],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    buyerNotificationsApi
      .getNotifications(100)
      .then((data) => {
        if (!mounted) return;
        const rows = Array.isArray(data?.notifications) ? data.notifications : [];
        setNotifications(rows.map((n) => ({ ...n, dateGroup: getDateGroup(n.createdAt) })));
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
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowBackToTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!clearAllOpen) return;
    const onDocClick = (e) => {
      const t = e?.target;
      if (!(t instanceof Element)) {
        setClearAllOpen(false);
        return;
      }
      if (!t.closest('[data-clear-all]')) setClearAllOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [clearAllOpen]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    setSelectedIds((s) => { const next = new Set(s); next.delete(id); return next; });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setSelectedIds(new Set());
    setMarkAllDone(true);
    setTimeout(() => setMarkAllDone(false), 2000);
  }, []);

  const deleteNotification = useCallback((id, undo = false) => {
    if (undo) {
      setDeletedId(null);
      setUndoId(null);
      return;
    }
    const item = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((s) => { const next = new Set(s); next.delete(id); return next; });
    setDeletedId(id);
    setUndoId(item);
    setTimeout(() => { setDeletedId(null); setUndoId(null); }, 5000);
  }, [notifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setSelectedIds(new Set());
    setClearAllOpen(false);
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    const visibleIds = filtered.map((n) => n.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) setSelectedIds((s) => { const next = new Set(s); visibleIds.forEach((id) => next.delete(id)); return next; });
    else setSelectedIds((s) => { const next = new Set(s); visibleIds.forEach((id) => next.add(id)); return next; });
  }, [filtered, selectedIds]);

  const toggleGroup = useCallback((g) => {
    setCollapsedGroups((s) => { const next = new Set(s); if (next.has(g)) next.delete(g); else next.add(g); return next; });
  }, []);

  const visibleCount = page * PER_PAGE;
  const displayed = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const byDisplayedGroup = DATE_GROUPS.reduce((acc, g) => {
    acc[g] = displayed.filter((n) => n.dateGroup === g);
    return acc;
  }, {});

  return (
    <BuyerLayout>
      <div
        className="min-h-screen"
        style={{
          background: 'var(--bg-page, #f8fafc)',
          color: 'var(--text-primary, #0f172a)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Tier 1 — Banner */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex items-center justify-between px-6 sm:px-8 lg:px-[32px] py-6"
          style={{
            height: 120,
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 60%, #f97316 100%)',
          }}
        >
          <div>
            <h1 className="text-white font-bold flex items-center gap-2" style={{ fontSize: 28 }}>🔔 Notifications</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Stay updated on your orders, deals and messages</p>
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Link to="/" className="hover:underline">Home</Link>
              <span> › </span>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>Notifications</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.span
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
              className="text-4xl notif-empty-bell-swing"
            >
              🔔
            </motion.span>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 rounded-full text-sm font-bold text-white"
                style={{ background: PRIMARY }}
              >
                {unreadCount} unread
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Tier 2 — Main content */}
        <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
          <div className="flex-1 min-w-0" style={{ flex: '1 1 70%' }}>
            {/* Tier 5 — Bulk toolbar */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="rounded-xl mb-4 flex items-center justify-between px-4 py-3 text-white overflow-hidden"
                  style={{ background: '#1a1a2e' }}
                >
                  <span className="font-semibold">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setNotifications((prev) => prev.map((n) => (selectedIds.has(n.id) ? { ...n, unread: false } : n))); setSelectedIds(new Set()); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--card-bg)]/20 hover:bg-[var(--card-bg)]/30">✓ Mark Read</button>
                    <button type="button" onClick={() => { setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id))); setSelectedIds(new Set()); }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--card-bg)]/20 hover:bg-[var(--card-bg)]/30">🗑️ Delete</button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[var(--card-bg)]/20">✕ Deselect All</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tier 3 — Action bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3"
              style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)' }}
            >
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: PRIMARY }}>{unreadCount} unread</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="px-3 py-2 rounded-lg text-sm font-medium border"
                  style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--btn-secondary-border)', color: markAllDone ? SUCCESS : 'var(--btn-secondary-text)' }}
                >
                  {markAllDone ? 'Done ✓' : '✓ Mark All Read'}
                </button>
                <div className="relative" data-clear-all>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setClearAllOpen((v) => !v); }} className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--btn-secondary-border)', color: 'var(--btn-secondary-text)' }}>🗑️ Clear All</button>
                  <AnimatePresence>
                    {clearAllOpen && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full mt-2 z-20 py-3 px-4 rounded-xl shadow-lg border min-w-[200px]" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-hover)' }}>
                        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Clear all notifications?</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setClearAllOpen(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold border" style={{ background: 'var(--btn-secondary-bg)', borderColor: 'var(--btn-secondary-border)', color: 'var(--text-muted)' }}>Cancel</button>
                          <button type="button" onClick={clearAll} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: ERROR }}>Clear All</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Link to="/account?tab=settings&section=notifications" className="p-2 rounded-lg border" title="Settings" style={{ borderColor: 'var(--btn-secondary-border)', color: 'var(--text-muted)', background: 'var(--btn-secondary-bg)' }}>
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Tier 4 — Tabs + search */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="rounded-xl p-2 mb-4 flex flex-wrap items-center gap-2 border"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
            >
              <div className="flex flex-wrap gap-1 flex-1 min-w-0 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterTab(t.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                    style={{
                      background: filterTab === t.id ? PRIMARY : 'transparent',
                      color: filterTab === t.id ? 'white' : tabCounts[t.id] === 0 ? 'var(--text-faint)' : 'var(--text-secondary)',
                      opacity: tabCounts[t.id] === 0 && filterTab !== t.id ? 0.7 : 1,
                    }}
                  >
                    <span>{t.icon}</span>
                    {t.label} ({tabCounts[t.id]})
                  </button>
                ))}
              </div>
              <div className="relative flex-shrink-0 w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="w-full h-9 pl-9 pr-8 rounded-lg border text-sm outline-none"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-tertiary)]">
                    <X className="w-4 h-4" style={{ color: '#64748b' }} />
                  </button>
                )}
              </div>
            </motion.div>

            {/* Select all row */}
            {filtered.length > 0 && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id))}
                    onChange={selectAllVisible}
                    className="rounded border-gray-300"
                    style={{ accentColor: PRIMARY }}
                  />
                  Select all visible
                </label>
              </div>
            )}

            {/* Tier 6 & 7 — Date groups + notification cards */}
            <div ref={mainRef} className="space-y-6 overflow-y-auto max-h-[60vh] lg:max-h-none">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-xl bg-[var(--card-bg)] p-5 animate-pulse" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 rounded bg-gray-200" style={{ width: '60%' }} />
                          <div className="h-3 rounded bg-[var(--bg-tertiary)]" style={{ width: '90%' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                /* Tier 10 — Empty states */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-[var(--card-bg)] py-16 px-6 text-center"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  <span className="text-6xl block mb-4 notif-empty-bell-swing">🔔</span>
                  <h3 className="font-bold text-xl mb-2" style={{ color: '#0f172a' }}>{searchQuery ? `No notifications matching '${searchQuery}'` : filterTab !== 'all' ? `No ${TABS.find((t) => t.id === filterTab)?.label?.toLowerCase()} notifications` : 'All caught up! 🎉'}</h3>
                  <p className="text-sm mb-6" style={{ color: '#64748b' }}>
                    {searchQuery ? 'Try a different search.' : filterTab === 'unread' ? "You're all caught up!" : filterTab === 'orders' ? 'No order updates yet. Start shopping!' : filterTab === 'deals' ? 'No active deals. Check back soon! 🏷️' : 'You have no notifications right now.'}
                  </p>
                  {searchQuery ? (
                    <button type="button" onClick={() => setSearchQuery('')} className="px-5 py-2.5 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Clear Search</button>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-3">
                      <Link to="/search" className="px-5 py-2.5 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Browse Deals →</Link>
                      <Link to="/" className="px-5 py-2.5 rounded-xl font-semibold border-2" style={{ borderColor: '#e5e7eb', color: '#475569' }}>Back to Shopping →</Link>
                    </div>
                  )}
                </motion.div>
              ) : (
                <>
                  {DATE_GROUPS.map((group, gi) => {
                    const items = byDisplayedGroup[group] || [];
                    if (items.length === 0) return null;
                    const collapsed = collapsedGroups.has(group);
                    return (
                      <motion.div
                        key={group}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + gi * 0.05 }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(group)}
                          className="flex items-center gap-2 w-full mb-3 group"
                        >
                          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8', letterSpacing: 2 }}>{group}</span>
                          <span className="flex-1 h-px bg-gray-200" />
                          <motion.span animate={{ rotate: collapsed ? -90 : 0 }}><ChevronDown className="w-4 h-4" style={{ color: '#94a3b8' }} /></motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-2 overflow-hidden"
                            >
                              {items.map((n, i) => (
                                <NotificationCard
                                  key={n.id}
                                  notification={n}
                                  index={i}
                                  selected={selectedIds.has(n.id)}
                                  onToggleSelect={() => toggleSelect(n.id)}
                                  onMarkRead={() => markAsRead(n.id)}
                                  onDelete={() => deleteNotification(n.id)}
                                  menuOpen={menuOpenId === n.id}
                                  setMenuOpen={(v) => setMenuOpenId(v ? n.id : null)}
                                  isDeleting={deletedId === n.id}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <button type="button" onClick={() => setPage((p) => p + 1)} className="px-6 py-3 rounded-xl font-semibold border-2" style={{ borderColor: PRIMARY, color: PRIMARY }}>Load More</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tier 9 — Right sidebar (hidden on mobile) */}
          <aside className="hidden lg:block w-full lg:w-[320px] flex-shrink-0 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="rounded-2xl bg-[var(--card-bg)] p-5 space-y-4"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            >
              <h3 className="font-bold text-sm" style={{ color: '#0f172a' }}>Notification Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:scale-[1.02] transition-transform">
                  <span className="text-lg font-bold" style={{ color: PRIMARY }}>{unreadCount}</span>
                  <p className="text-xs" style={{ color: '#64748b' }}>Unread</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:scale-[1.02] transition-transform">
                  <span className="text-lg font-bold" style={{ color: '#0f172a' }}>{tabCounts.orders}</span>
                  <p className="text-xs" style={{ color: '#64748b' }}>Order updates</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:scale-[1.02] transition-transform">
                  <span className="text-lg font-bold" style={{ color: '#0f172a' }}>{tabCounts.deals}</span>
                  <p className="text-xs" style={{ color: '#64748b' }}>Deals</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] hover:scale-[1.02] transition-transform">
                  <span className="text-lg font-bold" style={{ color: '#0f172a' }}>{tabCounts.system}</span>
                  <p className="text-xs" style={{ color: '#64748b' }}>System</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl bg-[var(--card-bg)] p-5 space-y-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <button type="button" onClick={markAllRead} className="w-full py-2.5 rounded-xl font-semibold text-white text-sm" style={{ background: PRIMARY }}>✓ Mark All Read</button>
              <Link to="/account?tab=settings&section=notifications" className="block w-full py-2.5 rounded-xl font-semibold text-sm text-center border-2" style={{ borderColor: '#e5e7eb', color: '#475569' }}>⚙️ Notification Settings</Link>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm" style={{ color: '#475569' }}>🔕 Do Not Disturb</span>
                <select value={dndHours} onChange={(e) => setDndHours(Number(e.target.value))} className="text-sm rounded-lg border border-[var(--divider)] px-2 py-1">
                  <option value={0}>Off</option>
                  <option value={1}>1h</option>
                  <option value={4}>4h</option>
                  <option value={8}>8h</option>
                  <option value={24}>Until tomorrow</option>
                </select>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-[var(--card-bg)] p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: '#0f172a' }}>Notification Channels</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>📧 Email</span><span className="font-medium" style={{ color: SUCCESS }}>ON</span></div>
                <div className="flex justify-between"><span>📱 SMS</span><span className="font-medium" style={{ color: '#94a3b8' }}>OFF</span></div>
                <div className="flex justify-between"><span>🔔 Push</span><span className="font-medium" style={{ color: SUCCESS }}>ON</span></div>
              </div>
              <Link to="/account?tab=settings&section=notifications" className="mt-3 inline-block text-sm font-semibold" style={{ color: PRIMARY }}>Manage All Settings →</Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} className="rounded-2xl bg-[var(--card-bg)] p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: '#0f172a' }}>Recent Activity</h3>
              <div className="space-y-2">
                {recentActivity.length === 0 ? (
                  <p className="text-sm px-1" style={{ color: '#94a3b8' }}>No recent activity yet.</p>
                ) : (
                  recentActivity.map((a) => (
                    <div key={a.id} className="w-full text-left py-2 px-3 rounded-lg text-sm" style={{ color: '#475569' }}>
                      {a.text} <span className="text-xs" style={{ color: '#94a3b8' }}>{a.time}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </aside>
        </div>

        {/* Undo toast */}
        <AnimatePresence>
          {undoId && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-gray-800 text-white text-sm font-medium flex items-center gap-3 shadow-lg"
            >
              Notification deleted
              <button type="button" onClick={() => { setNotifications((p) => [...p, undoId]); setDeletedId(null); setUndoId(null); }} className="font-semibold underline">Undo</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to top */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ background: PRIMARY }}
            >
              <ChevronRight className="w-5 h-5 rotate-270" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </BuyerLayout>
  );
}

function NotificationCard({
  notification: n,
  index = 0,
  selected,
  onToggleSelect,
  onMarkRead,
  onDelete,
  menuOpen,
  setMenuOpen,
  isDeleting,
}) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
  const [hover, setHover] = useState(false);
  const countdown = useCountdown(n.countdownEnd || 0);

  const handleCardClick = () => {
    if (n.unread) onMarkRead();
    if (n.type === 'order' && n.orderId) navigate(`/track/${n.orderId}`);
    else if (n.type === 'deal') navigate('/search?sort=discount');
    else if (n.type === 'message') navigate('/messages');
    else if (n.type === 'system') navigate('/account?tab=settings&section=profile');
    else if (n.type === 'review') navigate('/account?tab=reviews');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={isDeleting ? { opacity: 0, x: 80 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ duration: 0.35 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenuOpen(false); }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
      className={`rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all duration-200 border-l-[3px] ${n.unread ? 'bg-[#fff7ed]' : 'bg-[var(--card-bg)]'} hover:shadow-md hover:-translate-y-0.5`}
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderLeftColor: n.unread ? PRIMARY : 'transparent',
        outline: selected ? `2px solid #2563eb` : 'none',
        outlineOffset: 2,
      }}
    >
      {(hover || selected) && (
        <label className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="rounded border-gray-300" style={{ accentColor: PRIMARY }} />
        </label>
      )}
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: config.bg }}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1" style={{ background: `${config.color}20`, color: config.color }}>{config.label}</span>
        <p className={`text-[15px] ${n.unread ? 'font-bold' : 'font-medium'}`} style={{ color: n.unread ? '#0f172a' : '#475569' }}>{n.title}</p>
        <p className="text-[13px] line-clamp-2 mt-0.5" style={{ color: '#64748b' }}>{n.message}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11px]" style={{ color: '#94a3b8' }} title={n.time}>{n.time}</span>
          {n.orderId && <Link to={`/track/${n.orderId}`} onClick={(e) => e.stopPropagation()} className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: '#fff7ed', color: PRIMARY }}>📦 {n.orderId}</Link>}
          {n.type === 'deal' && countdown.active && (
            <span className={`text-[11px] font-medium ${countdown.underHour ? 'text-red-600' : ''}`}>⏰ {countdown.h}h {countdown.m}m {countdown.s}s</span>
          )}
        </div>
        {n.type === 'order' && n.productName && (
          <p className="text-xs mt-2" style={{ color: '#64748b' }}>{n.productName} · ${n.productPrice} · 🚚 {n.status}</p>
        )}
        {n.type === 'review' && (
          <div className="flex gap-0.5 mt-2" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((s) => <button key={s} type="button" className="text-lg hover:scale-110 transition-transform">⭐</button>)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {n.unread && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
        {(hover || menuOpen) && (
          <div className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="p-1.5 rounded-lg hover:bg-gray-200">
              <MoreVertical className="w-4 h-4" style={{ color: '#64748b' }} />
            </button>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 top-full mt-1 py-1 rounded-xl bg-[var(--card-bg)] shadow-lg border border-[var(--divider)] z-10 min-w-[160px]">
                <button type="button" onClick={() => { onMarkRead(); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-secondary)]">Mark as read</button>
                <button type="button" onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
