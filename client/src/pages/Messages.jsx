import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Search, ArrowLeft, MoreVertical, Package, Phone, Search as SearchIcon,
  X, Smile, Mic, ChevronDown, Check, CheckCheck, Volume2, VolumeX,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useAuthStore } from '../stores/authStore';

const PRIMARY = '#f97316';
const ONLINE = '#10b981';
const EASE = [0.25, 0.46, 0.45, 0.94];
const HEADER_HEIGHT = 138;

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
];

const REACTIONS = ['😊', '👍', '❤️', '😂', '😮'];
const EMOJI_GRID = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','👍','👎','👏','🙌','🤝','🙏'];
const MAX_INPUT_LENGTH = 500;

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    seller: 'Premium Store',
    avatar: null,
    initial: 'P',
    lastMsg: 'Yes, we can ship to your location.',
    time: '2m ago',
    unread: 2,
    orderId: 'ORD-1001',
    online: true,
    muted: false,
    orderContext: { orderId: 'ORD-1001', product: 'Watch', price: 4, status: 'Delivered ✓' },
    messages: [
      { id: 'm1', from: 'seller', text: 'Hello! How can I help you today?', time: '10:00 AM', date: 'Today', status: 'read' },
      { id: 'm2', from: 'buyer', text: 'Hi, I wanted to ask about delivery time for my order #ORD-1001.', time: '10:02 AM', date: 'Today', status: 'read' },
      { id: 'm3', from: 'seller', text: 'Your order will be dispatched today and should arrive within 3–5 business days.', time: '10:05 AM', date: 'Today', status: 'read' },
      { id: 'm4', from: 'buyer', text: 'Can you ship express?', time: '10:08 AM', date: 'Today', status: 'read' },
      { id: 'm5', from: 'seller', text: 'Yes, we can ship to your location.', time: '10:10 AM', date: 'Today', status: 'delivered' },
    ],
  },
  {
    id: 2,
    seller: 'TechHub',
    avatar: null,
    initial: 'T',
    lastMsg: 'The item is in stock and ready.',
    time: '1h ago',
    unread: 0,
    orderId: 'ORD-1002',
    online: false,
    lastSeen: '2h ago',
    muted: false,
    orderContext: { orderId: 'ORD-1002', product: 'Wireless Earbuds', price: 49.99, status: 'Shipped' },
    messages: [
      { id: 'n1', from: 'seller', text: 'Thank you for your order!', time: 'Yesterday', date: 'Yesterday', status: 'read' },
      { id: 'n2', from: 'buyer', text: 'Is the item in stock?', time: 'Yesterday', date: 'Yesterday', status: 'read' },
      { id: 'n3', from: 'seller', text: 'The item is in stock and ready.', time: 'Yesterday', date: 'Yesterday', status: 'read' },
    ],
  },
  {
    id: 3,
    seller: 'Fashion Co.',
    avatar: null,
    initial: 'F',
    lastMsg: 'We accept returns within 30 days.',
    time: '2d ago',
    unread: 0,
    orderId: 'ORD-1003',
    online: true,
    muted: true,
    orderContext: { orderId: 'ORD-1003', product: 'Summer Dress', price: 39, status: 'Delivered ✓' },
    messages: [
      { id: 'f1', from: 'buyer', text: 'What is your return policy?', time: '2 days ago', date: 'Feb 28, 2026', status: 'read' },
      { id: 'f2', from: 'seller', text: 'We accept returns within 30 days.', time: '2 days ago', date: 'Feb 28, 2026', status: 'read' },
    ],
  },
];

function formatDateKey(dateStr) {
  const d = new Date();
  const today = d.toDateString();
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === 'Today') return 'Today';
  if (dateStr === 'Yesterday') return 'Yesterday';
  return dateStr;
}

export default function Messages() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [input, setInput] = useState('');
  const [convs, setConvs] = useState(MOCK_CONVERSATIONS);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [mobileView, setMobileView] = useState('list');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [orderBannerDismissed, setOrderBannerDismissed] = useState({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [reactions, setReactions] = useState({});
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const bottomRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const inputRef = useRef(null);

  const conv = convs.find((c) => c.id === active);
  const unreadTotal = convs.reduce((n, c) => n + (c.unread || 0), 0);

  const filteredByTab = convs.filter((c) => {
    if (tab === 'unread') return (c.unread || 0) > 0;
    if (tab === 'orders') return !!c.orderId;
    return true;
  });
  const searchLower = search.toLowerCase().trim();
  const filtered = filteredByTab.filter(
    (c) =>
      !searchLower ||
      (c.seller && c.seller.toLowerCase().includes(searchLower)) ||
      (c.lastMsg && c.lastMsg.toLowerCase().includes(searchLower)) ||
      (c.orderId && c.orderId.toLowerCase().includes(searchLower))
  );

  function highlightMatch(text, query) {
    if (!query?.trim() || !text) return text;
    const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${q})`, 'gi');
    const parts = String(text).split(re);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <span key={i} className="font-semibold" style={{ color: PRIMARY }}>{part}</span>
        : part
    );
  }

  useEffect(() => {
    const t = setTimeout(() => setListLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages, sending]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShowScrollBottom(!nearBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [active]);

  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) Messages — Reaglex` : 'Messages — Reaglex';
    return () => { document.title = 'Reaglex'; };
  }, [unreadTotal]);

  useEffect(() => {
    const close = (e) => {
      if (showAttach || showEmoji || showMore) {
        const target = e.target;
        if (
          !target.closest('[data-attach-panel]') &&
          !target.closest('[data-emoji-panel]') &&
          !target.closest('[data-more-panel]')
        ) {
          setShowAttach(false);
          setShowEmoji(false);
          setShowMore(false);
        }
      }
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showAttach, showEmoji, showMore]);

  const sendMsg = (e) => {
    e.preventDefault();
    if (!input.trim() || !active) return;
    const text = input.trim();
    setInput('');
    setShowEmoji(false);
    setSending(true);
    const newMsg = {
      id: 'tmp-' + Date.now(),
      from: 'buyer',
      text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      status: 'sending',
    };
    setConvs((cs) =>
      cs.map((c) =>
        c.id === active
          ? { ...c, messages: [...c.messages, newMsg], lastMsg: text, time: 'now', unread: 0 }
          : c
      )
    );
    setTimeout(() => {
      setConvs((cs) =>
        cs.map((c) =>
          c.id === active
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: 'read' } : m
                ),
              }
            : c
        )
      );
      setSending(false);
      const reply = {
        id: 'r-' + Date.now(),
        from: 'seller',
        text: "Thanks for your message! We'll get back to you shortly.",
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
        status: 'delivered',
      };
      setTimeout(() => {
        setConvs((cs) =>
          cs.map((c) => (c.id === active ? { ...c, messages: [...c.messages, reply] } : c))
        );
      }, 1500);
    }, 800);
  };

  const openConv = (id) => {
    setActive(id);
    setMobileView('chat');
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setShowAttach(false);
    setShowEmoji(false);
    setShowMore(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleReaction = (msgId, emoji) => {
    setReactions((prev) => {
      const key = `${active}-${msgId}`;
      const current = prev[key] || [];
      const existing = current.find((r) => r.emoji === emoji);
      let next;
      if (existing) {
        next = current.filter((r) => r.emoji !== emoji);
      } else {
        next = [...current, { emoji, count: 1 }];
      }
      return { ...prev, [key]: next.length ? next : undefined };
    });
    setHoveredMsgId(null);
  };

  const getReactions = (msgId) => (active ? (reactions[`${active}-${msgId}`] || []) : []);

  if (!user)
    return (
      <BuyerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Sign in to view messages
          </h2>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-2xl text-white font-semibold"
            style={{ background: PRIMARY }}
          >
            Sign In
          </button>
        </div>
      </BuyerLayout>
    );

  const chatHeight = `calc(100vh - ${HEADER_HEIGHT}px)`;

  return (
    <BuyerLayout>
      <div
        className="grid grid-cols-1 md:grid-cols-[340px_1fr] border-t"
        style={{
          height: chatHeight,
          minHeight: 400,
          fontFamily: 'Inter, sans-serif',
          background: 'var(--bg-page)',
          borderColor: 'var(--divider)',
        }}
      >
        {/* ═══ LEFT PANEL ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
          className={`flex flex-col w-full md:w-[340px] md:flex-shrink-0 border-r ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}
          style={{
            borderColor: 'var(--divider)',
            height: chatHeight,
            background: 'var(--sidebar-bg)',
          }}
        >
          {/* Panel header */}
          <div className="p-4 pb-2 flex-shrink-0">
            <h1
              className="text-xl font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Messages
              {unreadTotal > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="messages-unread-badge w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: PRIMARY }}
                >
                  {unreadTotal}
                </motion.span>
              )}
            </h1>

            {/* Tabs */}
            <div
              className="relative flex mt-3 border-b"
              style={{ borderColor: 'var(--divider-strong)' }}
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                  style={{ color: tab === t.id ? PRIMARY : 'var(--text-muted)' }}
                >
                  {t.label}
                </button>
              ))}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 rounded-full"
                style={{ background: PRIMARY, width: '33.33%' }}
                animate={{ x: `${TABS.findIndex((t) => t.id === tab) * 100}%` }}
                transition={{ duration: 0.25, ease: EASE }}
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 pb-2 flex-shrink-0">
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors duration-150`}
              style={{
                background: search ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                borderColor: search ? PRIMARY : 'transparent',
                boxShadow: search ? '0 0 0 2px rgba(249,115,22,0.2)' : 'none',
              }}
            >
              <Search
                className="w-4 h-4 flex-shrink-0"
                style={{ color: 'var(--text-faint)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="flex-1 text-sm outline-none bg-transparent min-w-0"
                style={{ color: 'var(--input-text)' }}
              />
              {search && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-0.5 rounded"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {listLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-3">
                    <div
                      className="w-12 h-12 rounded-full animate-pulse flex-shrink-0 skeleton"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded skeleton" />
                      <div className="h-3 w-1/2 rounded skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <SearchIcon
                  className="w-10 h-10 mb-2"
                  style={{ color: 'var(--text-faint)' }}
                />
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No conversations found
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {filtered.map((c, idx) => (
                  <motion.button
                    key={c.id}
                    type="button"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.08, duration: 0.25, ease: EASE }}
                    onClick={() => openConv(c.id)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left border-l-[3px]"
                    style={{
                      background: active === c.id ? 'var(--bg-active)' : 'transparent',
                      borderLeftColor: active === c.id ? PRIMARY : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (active !== c.id) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (active !== c.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${PRIMARY}, #ea580c)` }}
                      >
                        {c.initial}
                      </div>
                      {c.online ? (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 messages-online-pulse"
                          style={{
                            background: ONLINE,
                            borderColor: 'var(--sidebar-bg)',
                          }}
                        />
                      ) : (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                          style={{
                            background: 'var(--text-faint)',
                            borderColor: 'var(--sidebar-bg)',
                          }}
                        />
                      )}
                      {(c.unread || 0) > 0 && (
                        <span
                          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                          style={{ background: '#2563eb' }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{
                          color: active === c.id ? PRIMARY : 'var(--text-primary)',
                          fontWeight: (c.unread || 0) > 0 ? 700 : 600,
                        }}
                      >
                        {highlightMatch(c.seller, search)}
                      </p>
                      <p
                        className="text-xs truncate mt-0.5"
                        style={{
                          color: (c.unread || 0) > 0 ? 'var(--text-secondary)' : 'var(--text-faint)',
                        }}
                      >
                        {highlightMatch(c.lastMsg, search)}
                      </p>
                      {c.orderId && (
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: 'var(--brand-light)',
                            color: PRIMARY,
                          }}
                        >
                          {highlightMatch(c.orderId, search)}
                        </span>
                      )}
                    </div>

                    {/* Time + badge */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        {c.time}
                      </span>
                      {(c.unread || 0) > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: PRIMARY }}
                        >
                          {c.unread}
                        </motion.span>
                      )}
                      {c.muted && (
                        <VolumeX
                          className="w-3.5 h-3.5"
                          style={{ color: 'var(--text-faint)' }}
                        />
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* ═══ RIGHT PANEL ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3, ease: EASE }}
          className={`flex flex-col flex-1 min-w-0 ${mobileView === 'list' && !active ? 'hidden md:flex' : 'flex'}`}
          style={{
            height: chatHeight,
            background: 'var(--bg-secondary)',
          }}
        >
          {!conv ? (
            /* ═══ EMPTY STATE ═══ */
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                className="relative mb-6 messages-float"
              >
                <div className="flex gap-2 items-end">
                  <div
                    className="w-14 h-14 rounded-2xl rounded-bl-sm flex items-center justify-center text-2xl shadow-lg"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      boxShadow: 'var(--card-shadow)',
                    }}
                  >
                    💬
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl rounded-br-sm flex items-center justify-center text-xl shadow-lg"
                    style={{ background: PRIMARY, color: 'white' }}
                  >
                    👋
                  </div>
                </div>
              </motion.div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Your Messages
              </h2>
              <p
                className="text-sm text-center max-w-sm mb-6"
                style={{ color: 'var(--text-muted)' }}
              >
                Select a conversation from the left to start chatting with sellers about your orders.
              </p>
              <Link
                to="/search"
                className="px-5 py-2.5 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: PRIMARY }}
              >
                Browse Products →
              </Link>
            </div>
          ) : (
            <div className="relative flex flex-col flex-1 min-h-0">
              {/* ═══ CHAT HEADER ═══ */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between h-16 px-4 border-b flex-shrink-0"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--divider)',
                  boxShadow: 'var(--nav-shadow)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 -ml-2 rounded-lg"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${PRIMARY}, #ea580c)` }}
                    >
                      {conv.initial}
                    </div>
                    {conv.online && (
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 messages-online-pulse"
                        style={{ background: ONLINE, borderColor: 'var(--card-bg)' }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-bold truncate"
                      style={{ color: 'var(--text-primary)', fontSize: 15 }}
                    >
                      {conv.seller}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{
                        color: conv.typing ? PRIMARY : conv.online ? ONLINE : 'var(--text-muted)',
                      }}
                    >
                      {conv.typing ? 'Typing...' : conv.online ? '🟢 Online' : `Last seen ${conv.lastSeen || 'recently'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={`/track/${conv.orderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-colors"
                    title="View Order"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Package className="w-5 h-5" />
                  </a>
                  <button
                    type="button"
                    className="p-2 rounded-lg opacity-50 cursor-not-allowed"
                    title="Call (coming soon)"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg transition-colors"
                    title="Search in chat"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <SearchIcon className="w-5 h-5" />
                  </button>

                  {/* More menu */}
                  <div className="relative" data-more-panel>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowMore(!showMore); }}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showMore && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute right-0 top-full mt-1 py-1 rounded-xl shadow-lg border z-10 min-w-[180px]"
                          style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                            boxShadow: 'var(--card-shadow-hover)',
                          }}
                        >
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Volume2 className="w-4 h-4" /> Mute notifications
                          </button>
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Mark as unread
                          </button>
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm text-red-500"
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Block seller
                          </button>
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm text-red-500"
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Report conversation
                          </button>
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Clear chat history
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Order context banner */}
              {conv.orderContext && !orderBannerDismissed[conv.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b"
                  style={{
                    background: 'var(--brand-light)',
                    borderColor: 'var(--brand-border)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      This conversation is about:
                    </span>
                    <Link
                      to={`/track/${conv.orderId}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors"
                      style={{
                        color: PRIMARY,
                        background: 'var(--card-bg)',
                        borderColor: 'var(--brand-border)',
                      }}
                    >
                      📦 {conv.orderContext.orderId} · {conv.orderContext.product} · ${conv.orderContext.price} · {conv.orderContext.status}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderBannerDismissed((p) => ({ ...p, [conv.id]: true }))}
                    className="p-1 rounded"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Messages area */}
              <div
                ref={messagesScrollRef}
                className="flex-1 overflow-y-auto min-h-0 px-4 py-3"
                style={{ background: 'var(--bg-page)' }}
              >
                {conv.messages.map((m, i) => {
                  const prev = conv.messages[i - 1];
                  const showDate = !prev || formatDateKey(prev.date) !== formatDateKey(m.date);
                  return (
                    <div key={m.id}>
                      {showDate && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-center my-4"
                        >
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {formatDateKey(m.date)}
                          </span>
                        </motion.div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: m.from === 'buyer' ? 0 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`flex gap-2 mb-3 ${m.from === 'buyer' ? 'justify-end' : 'justify-start'}`}
                      >
                        {m.from === 'seller' && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: PRIMARY }}
                          >
                            {conv.initial}
                          </div>
                        )}
                        <div
                          className={`flex flex-col max-w-[75%] ${m.from === 'buyer' ? 'items-end' : 'items-start'} group`}
                          onMouseEnter={() => setHoveredMsgId(m.id)}
                          onMouseLeave={() => setHoveredMsgId(null)}
                        >
                          {/* Reaction picker */}
                          {hoveredMsgId === m.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-0.5 mb-1"
                            >
                              {REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className="w-7 h-7 rounded flex items-center justify-center text-sm hover:scale-110"
                                  style={{ transition: 'transform 0.15s ease' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {/* Bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm ${m.from === 'buyer' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                            style={
                              m.from === 'buyer'
                                ? {
                                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                    color: 'white',
                                  }
                                : {
                                    background: 'var(--bubble-received-bg)',
                                    color: 'var(--bubble-received-text)',
                                    border: '1px solid var(--bubble-received-border)',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                  }
                            }
                          >
                            {m.status === 'sending' && (
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 align-middle" />
                            )}
                            {m.text}
                          </div>

                          {/* Reactions display */}
                          {getReactions(m.id).length > 0 && (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="flex flex-wrap gap-1 mt-0.5"
                            >
                              {getReactions(m.id).map((r) => (
                                <span
                                  key={r.emoji}
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {r.emoji} {r.count > 1 ? r.count : ''}
                                </span>
                              ))}
                            </motion.div>
                          )}

                          {/* Timestamp + status */}
                          <div className="flex items-center gap-1 mt-0.5 px-1">
                            <span
                              className="text-[11px]"
                              style={{
                                color: m.from === 'buyer'
                                  ? 'rgba(255,255,255,0.7)'
                                  : 'var(--bubble-timestamp)',
                              }}
                            >
                              {m.time}
                            </span>
                            {m.from === 'buyer' && (
                              <span className="text-[11px]">
                                {m.status === 'sending' ? (
                                  <span className="opacity-70">⋯</span>
                                ) : m.status === 'sent' ? (
                                  <Check className="w-3.5 h-3.5 inline" style={{ color: 'rgba(255,255,255,0.8)' }} />
                                ) : m.status === 'delivered' || m.status === 'read' ? (
                                  <CheckCheck
                                    className="w-3.5 h-3.5 inline"
                                    style={{ color: m.status === 'read' ? PRIMARY : 'rgba(255,255,255,0.8)' }}
                                  />
                                ) : null}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 py-2"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: PRIMARY }}
                    >
                      {conv.initial}
                    </div>
                    <div
                      className="px-4 py-2 rounded-2xl rounded-tl-sm border shadow-sm"
                      style={{
                        background: 'var(--bubble-received-bg)',
                        borderColor: 'var(--bubble-received-border)',
                      }}
                    >
                      <span
                        className="messages-typing-dot inline-block w-2 h-2 rounded-full mx-0.5"
                        style={{ background: 'var(--text-faint)' }}
                      />
                      <span
                        className="messages-typing-dot inline-block w-2 h-2 rounded-full mx-0.5"
                        style={{ background: 'var(--text-faint)' }}
                      />
                      <span
                        className="messages-typing-dot inline-block w-2 h-2 rounded-full mx-0.5"
                        style={{ background: 'var(--text-faint)' }}
                      />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll-to-bottom button */}
              {showScrollBottom && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-28 right-6 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-10 border-0"
                  style={{ background: PRIMARY }}
                >
                  <ChevronDown className="w-5 h-5 text-white" />
                </motion.button>
              )}

              {/* ═══ INPUT AREA ═══ */}
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={sendMsg}
                className="flex items-end gap-2 p-3 border-t flex-shrink-0"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--divider)',
                  minHeight: 80,
                }}
              >
                {/* Attachment + Emoji buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Attachment */}
                  <div className="relative" data-attach-panel>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setShowEmoji(false); }}
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showAttach && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                          className="absolute bottom-full left-0 mb-2 py-2 px-2 rounded-xl shadow-lg border"
                          style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                            boxShadow: 'var(--card-shadow-hover)',
                          }}
                        >
                          {[['📷', 'Photo'], ['📄', 'Document'], ['📦', 'Share Order']].map(([icon, label]) => (
                            <button
                              key={label}
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm rounded-lg flex items-center gap-2"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-active)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {icon} {label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Emoji */}
                  <div className="relative" data-emoji-panel>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowEmoji(!showEmoji); setShowAttach(false); }}
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showEmoji && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute bottom-full left-0 mb-2 p-3 rounded-xl shadow-lg border max-h-48 overflow-y-auto grid grid-cols-8 gap-1"
                          style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                            boxShadow: 'var(--card-shadow-hover)',
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Search emoji"
                            className="col-span-8 px-2 py-1 text-sm border rounded mb-2"
                            style={{
                              background: 'var(--input-bg)',
                              borderColor: 'var(--input-border)',
                              color: 'var(--input-text)',
                            }}
                          />
                          {EMOJI_GRID.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => { setInput((i) => i + em); }}
                              className="text-lg rounded p-1 hover:scale-110"
                              style={{ transition: 'transform 0.1s ease' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {em}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Text input */}
                <div
                  className="flex-1 flex flex-col rounded-xl min-h-[44px] px-3 py-2 border transition-colors"
                  style={{
                    background: input ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                    borderColor: input ? PRIMARY : 'transparent',
                    boxShadow: input ? '0 0 0 2px rgba(249,115,22,0.2)' : 'none',
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                    onFocus={() => { setShowAttach(false); }}
                    placeholder={`Type a message to ${conv.seller}...`}
                    rows={1}
                    className="w-full resize-none bg-transparent text-sm outline-none py-2 min-h-[24px] max-h-[100px]"
                    style={{ color: 'var(--input-text)' }}
                  />
                  {input.length >= 200 && (
                    <span
                      className="text-[11px] mt-0.5"
                      style={{ color: input.length > 450 ? '#ef4444' : 'var(--text-muted)' }}
                    >
                      {input.length}/{MAX_INPUT_LENGTH}
                    </span>
                  )}
                </div>

                {/* Send / Mic button */}
                <AnimatePresence mode="wait">
                  {input.trim() ? (
                    <motion.button
                      key="send"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileTap={{ scale: 0.9 }}
                      type="submit"
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: PRIMARY }}
                    >
                      <Send className="w-5 h-5 text-white" />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="mic"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      type="button"
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      title="Voice note (coming soon)"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--divider-strong)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    >
                      <Mic className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.form>
            </div>
          )}
        </motion.div>
      </div>
    </BuyerLayout>
  );
}
