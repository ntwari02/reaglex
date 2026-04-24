import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/config';

type Sender = 'bot' | 'user';

interface ProductCardPayload {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrls: string[];
}

interface ChatMessage {
  id: string;
  from: Sender;
  text: string;
  ts: string;
  helpful?: 'up' | 'down' | null;
  kind?: 'track' | 'escrow' | 'return' | 'payment' | 'seller' | 'greeting' | 'default';
  /** Rich payload from /api/ai/chat agent */
  productCards?: ProductCardPayload[];
  paymentLink?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
}

function inferKind(text: string): ChatMessage['kind'] {
  const t = (text || '').toLowerCase();
  if (t.includes('track') || t.includes('order')) return 'track';
  if (t.includes('escrow')) return 'escrow';
  if (t.includes('return') || t.includes('refund')) return 'return';
  if (t.includes('payment') || t.includes('card') || t.includes('money')) return 'payment';
  if (t.includes('seller') || t.includes('store') || t.includes('product')) return 'seller';
  if (t.includes('hello') || t.includes('hi')) return 'greeting';
  return 'default';
}

const STORAGE_KEY = 'reaglex_help_chat';
const MAX_MESSAGES = 50;
const PRIMARY = '#f97316';

function GeminiIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 1.5L14.9 9.1L22.5 12L14.9 14.9L12 22.5L9.1 14.9L1.5 12L9.1 9.1L12 1.5Z" fill="url(#gemini-gradient-help)" />
      <defs>
        <linearGradient id="gemini-gradient-help" x1="1.5" y1="1.5" x2="22.5" y2="22.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.55" stopColor="#9333EA" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const QUICK_CHIPS = [
  { label: 'Track order', payload: 'Track order' },
  { label: 'Escrow?', payload: 'Escrow' },
  { label: 'Return item', payload: 'Return item' },
  { label: 'Payment help', payload: 'Payment help' },
  { label: 'Become seller', payload: 'Become a seller' },
];

export default function HelpChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Hide on auth-only flows (assistant available on buyer + seller + admin storefront areas)
  const isHidden =
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-otp';

  const [open, setOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // Load from sessionStorage (browser-only, defensively guarded)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storage = window.sessionStorage;
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-MAX_MESSAGES));
          setHasUnread(true);
          return;
        }
      }
    } catch {
      // ignore and fall back to default welcome message
    }

    const welcome: ChatMessage = {
      id: 'welcome',
      from: 'bot',
      ts: 'Just now',
      text:
        "👋 Hi! I'm here to help.\n\nAsk me about:\n- Orders & tracking\n- Payments & escrow\n- Returns & refunds\n- Account help",
    };
    setMessages([welcome]);
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!messages.length) return;
      const trimmed = messages.slice(-MAX_MESSAGES);
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }, [messages]);

  const scrollToBottom = (smooth = true) => {
    if (!listEndRef.current) return;
    listEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom(false);
      setHasUnread(false);
    }
  }, [open]);

  const handleToggleOpen = () => {
    setOpen((o) => !o);
    setShowHistory(false);
    setHasInteracted(true);
  };

  const handleClear = () => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      from: 'bot',
      ts: 'Just now',
      text:
        "👋 Hi! I'm here to help.\n\nAsk me about:\n- Orders & tracking\n- Payments & escrow\n- Returns & refunds\n- Account help",
    };
    setMessages([welcome]);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const handleNewChat = () => {
    handleClear();
    setShowHistory(false);
    // ensure we jump to the bottom of the fresh conversation
    setTimeout(() => scrollToBottom(false), 0);
  };

  const handleToggleHistory = () => {
    if (!recentQueries.length) return;
    setShowHistory((prev) => {
      const next = !prev;
      if (next && messagesRef.current) {
        // Scroll to top so the history panel is visible even if user was at bottom
        messagesRef.current.scrollTop = 0;
      }
      return next;
    });
  };

  const addMessage = (
    from: Sender,
    text: string,
    kind?: ChatMessage['kind'],
    extras?: Pick<
      ChatMessage,
      'productCards' | 'paymentLink' | 'paymentAmount' | 'paymentCurrency'
    >
  ) => {
    const msg: ChatMessage = {
      id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from,
      text,
      ts: 'Just now',
      kind,
      ...extras,
    };
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    return msg;
  };

  const handleSend = async (value?: string) => {
    const content = (value ?? input).trim();
    if (!content) return;
    setInput('');
    setHasInteracted(true);
    const userMsg = addMessage('user', content);
    setTyping(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      let response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: userMsg.text }),
      });

      if (!response.ok && (response.status === 503 || response.status >= 500)) {
        response = await fetch(`${API_BASE_URL}/assistant/chat`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ message: userMsg.text }),
        });
      }

      if (!response.ok) {
        throw new Error('assistant-unavailable');
      }

      const data = await response.json();
      const text = String(data?.reply || '').trim();
      const products = Array.isArray(data?.products) ? data.products : [];
      const productCards: ProductCardPayload[] | undefined =
        products.length > 0
          ? products.map((p: any) => ({
              id: String(p.id),
              name: String(p.name || ''),
              price: Number(p.price) || 0,
              currency: String(p.currency || 'USD'),
              imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : p.images || [],
            }))
          : undefined;
      const pay = data?.payment;
      const extras =
        productCards?.length || pay?.paymentLink
          ? {
              productCards,
              paymentLink: pay?.paymentLink as string | undefined,
              paymentAmount: pay?.amount as number | undefined,
              paymentCurrency: pay?.currency as string | undefined,
            }
          : undefined;

      addMessage(
        'bot',
        text || 'How can I help you today?',
        inferKind(text),
        extras
      );
    } catch {
      // Fallback for local/dev when assistant API key is not configured
      const reply = getBotReply(userMsg.text.toLowerCase());
      addMessage('bot', reply.text, reply.kind);
    } finally {
      setTyping(false);
      setTimeout(() => scrollToBottom(), 50);
    }
  };

  const getBotReply = (raw: string): { text: string; kind: ChatMessage['kind'] } => {
    const t = raw.toLowerCase();
    const matchAny = (keys: string[]) => keys.some((k) => t.includes(k));

    if (matchAny(['hello', 'hi ', ' hi', 'hey'])) {
      return {
        text:
          "Hello! 👋 How can I help you today?\nAsk me anything about Reaglex!",
        kind: 'greeting',
      };
    }

    if (matchAny(['track', 'tracking', 'where is my order'])) {
      return {
        text:
          "To track your order: 📦\nGo to Account → My Orders → Click Track\n\nOr visit the Track My Order page.\nNeed help finding your order number?",
        kind: 'track',
      };
    }

    if (matchAny(['escrow', 'how does escrow'])) {
      return {
        text:
          "Reaglex Escrow protects you! 🛡️\n\n1. You pay → money held safely\n2. Seller ships your item\n3. You confirm receipt\n4. Money released to seller\n\nYour money is NEVER sent until you're satisfied! ✓",
        kind: 'escrow',
      };
    }

    if (matchAny(['return', 'refund'])) {
      return {
        text:
          "You can return within 30 days! ↩\n\nGo to Account → Returns\n→ New Return Request\n→ Select order → Submit\n\nRefund in 3-5 business days 💰",
        kind: 'return',
      };
    }

    if (matchAny(['payment', 'pay ', 'card'])) {
      return {
        text:
          "We accept: 💳\n- Visa / Mastercard\n- MTN Mobile Money\n- Airtel Money\n- Bank Transfer\n\nPayment failed? Check card details or try another method.",
        kind: 'payment',
      };
    }

    if (matchAny(['seller', 'become seller', 'sell on reaglex'])) {
      return {
        text:
          "Start selling on Reaglex! 🏪\n\nClick 'Become a Seller' in header\n→ Verify identity\n→ Set up store\n→ Add products → Earn!\n\n5% commission per sale.",
        kind: 'seller',
      };
    }

    return {
      text:
        "I'm not sure about that. 🤔\n\nTry asking about:\n- Order tracking\n- Returns & refunds\n- Payments\n- Escrow protection\n\nOr contact our team:\nsupport@reaglex.com",
      kind: 'default',
    };
  };

  const handleHelpful = (id: string, value: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, helpful: m.helpful === value ? null : value }
          : m
      )
    );
  };

  const handleChipClick = (chip: string) => {
    handleSend(chip);
  };

  const onMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollDown(!nearBottom);
  };

  const parsedMessages = useMemo(() => messages, [messages]);
  const hasUserMessages = useMemo(
    () => parsedMessages.some((m) => m.from === 'user'),
    [parsedMessages]
  );
  const recentQueries = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (let i = messages.length - 1; i >= 0 && result.length < 8; i -= 1) {
      const m = messages[i];
      if (m.from !== 'user') continue;
      const text = (m.text || '').trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(text);
    }
    return result.reverse();
  }, [messages]);

  // Open when a global "open help chat" event is dispatched (e.g. footer Help link)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => {
      setOpen(true);
      setHasInteracted(true);
      setHasUnread(false);
      setShowHistory(false);
    };
    try {
      window.addEventListener('reaglex-open-help-chat', handler);
    } catch {
      // ignore
    }
    return () => {
      try {
        window.removeEventListener('reaglex-open-help-chat', handler);
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const styleId = 'helpchat-gemini-icon-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .gemini-trigger-btn { background: transparent !important; color: #111827 !important; }
      .gemini-chat-header-icon { display:flex; align-items:center; justify-content:center; }
      .gemini-msg-avatar { width: 28px; height: 28px; display:flex; align-items:center; justify-content:center; margin-right:8px; flex-shrink:0; }
      .gemini-animated-icon { animation: geminiFloatSpin 3.2s ease-in-out infinite; filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.35)); transform-origin: 50% 50%; }
      @keyframes geminiFloatSpin {
        0% { transform: translateY(0) rotate(0deg) scale(1); }
        50% { transform: translateY(-2px) rotate(8deg) scale(1.04); }
        100% { transform: translateY(0) rotate(0deg) scale(1); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  if (isHidden) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <div
        style={{
          position: 'fixed',
          right: 28,
          bottom: 28,
          zIndex: 9999,
        }}
      >
        {/* Tooltip */}
        {!hasInteracted && !open && (
          <div
            style={{
              position: 'absolute',
              right: 72,
              bottom: 10,
              background: '#111420',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            Need help? Ask us!
            <div
              style={{
                position: 'absolute',
                right: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid #111420',
              }}
            />
          </div>
        )}

        {/* Pulse ring */}
        {!hasInteracted && !open && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '999px',
              boxShadow: '0 0 0 0 rgba(249,115,22,0.35)',
              animation: 'helpchat-pulse 2.5s ease-out infinite',
            }}
          />
        )}

        <button
          type="button"
          onClick={handleToggleOpen}
          className="gemini-trigger-btn"
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            boxShadow:
              '0 8px 28px rgba(15,23,42,0.22),0 4px 12px rgba(15,23,42,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111827',
            fontSize: 28,
            transition:
              'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              'scale(1.12) translateY(-3px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 12px 36px rgba(249,115,22,0.65)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 8px 28px rgba(249,115,22,0.50),0 4px 12px rgba(249,115,22,0.30)';
          }}
        >
          <GeminiIcon size={28} className="gemini-animated-icon" />

          {/* Notification dot */}
          {hasUnread && !open && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid var(--bg-page)',
              }}
            />
          )}
        </button>
      </div>

      {/* Chat modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.85,
              y: 20,
              transformOrigin: 'bottom right',
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{
              duration: 0.35,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{
              position: 'fixed',
              right: 28,
              bottom: 104,
              width: 380,
              height: 540,
              borderRadius: 24,
              overflow: 'hidden',
              background: 'var(--card-bg)',
              boxShadow:
                '0 24px 64px rgba(0,0,0,0.85),0 8px 24px rgba(0,0,0,0.60)',
              zIndex: 9998,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                height: 72,
                padding: '0 18px',
                background:
                  'linear-gradient(135deg,#0f0c24 0%,#1a0f3a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="gemini-chat-header-icon" style={{ position: 'relative' }}>
                  <GeminiIcon size={22} className="gemini-animated-icon" />
                  <span
                    style={{
                      position: 'absolute',
                      right: -1,
                      bottom: 0,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow:
                        '0 0 0 0 rgba(16,185,129,0.6)',
                      animation: 'helpchat-status 2s ease-out infinite',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Reaglex Assistant
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#10b981',
                      }}
                    />
                    <span>Online now</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleToggleHistory}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 16,
                    cursor: recentQueries.length ? 'pointer' : 'default',
                    opacity: recentQueries.length ? 1 : 0.4,
                  }}
                  title="Conversation history"
                >
                  🕑
                </button>
                <button
                  type="button"
                  onClick={handleNewChat}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'rgba(255,255,255,0.14)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </span>
                  <span>New chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesRef}
              onScroll={onMessagesScroll}
              style={{
                flex: 1,
                padding: 16,
                background: 'var(--bg-page)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                position: 'relative',
              }}
            >
              {/* History panel */}
              {showHistory && recentQueries.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 240,
                    maxHeight: 260,
                    overflowY: 'auto',
                    background: 'var(--card-bg)',
                    boxShadow: '0 16px 40px rgba(15,23,42,0.6)',
                    borderRadius: 12,
                    padding: 10,
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Recent questions
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: 'var(--text-muted)',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {recentQueries.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        handleSend(q);
                        setShowHistory(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        marginBottom: 4,
                        background: 'transparent',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {q}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Starter cards for a fresh session (no user messages yet) */}
              {!hasUserMessages && (
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {[
                    {
                      title: 'Track an order',
                      desc: 'Check the status of any Reaglex order.',
                      payload: 'Where is my order?',
                    },
                    {
                      title: 'Understand escrow protection',
                      desc: 'Learn how your money is held and released.',
                      payload: 'How does Reaglex escrow work?',
                    },
                    {
                      title: 'Help with a return / refund',
                      desc: 'Get guided through the 30-day return process.',
                      payload: 'I want to return an item.',
                    },
                    {
                      title: 'Account & security help',
                      desc: 'Profile, login, and security questions.',
                      payload: 'I need help with my account.',
                    },
                  ].map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleSend(card.payload)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 10px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        background: 'var(--card-bg)',
                        boxShadow: '0 6px 18px rgba(15,23,42,0.35)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: 2,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {card.desc}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {parsedMessages.map((m) => {
                const isUser = m.from === 'user';
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isUser && (
                      <div className="gemini-msg-avatar">
                        <GeminiIcon size={16} className="gemini-animated-icon" />
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: isUser ? '80%' : '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: isUser ? '10px 14px' : '12px 14px',
                          borderRadius: isUser
                            ? '16px 4px 16px 16px'
                            : '4px 16px 16px 16px',
                          background: isUser
                            ? 'linear-gradient(135deg,#f97316,#ea580c)'
                            : 'var(--card-bg)',
                          color: isUser ? '#ffffff' : 'var(--text-primary)',
                          boxShadow: isUser
                            ? '0 4px 10px rgba(249,115,22,0.25)'
                            : '0 4px 12px rgba(15,23,42,0.15)',
                          fontSize: 13,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {m.text}
                      </div>
                      {m.from === 'bot' && m.productCards && m.productCards.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            maxWidth: '100%',
                          }}
                        >
                          {m.productCards.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => navigate(`/products/${p.id}`)}
                              style={{
                                width: 120,
                                padding: 0,
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 10,
                                overflow: 'hidden',
                                background: 'var(--card-bg)',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              <div
                                style={{
                                  width: '100%',
                                  height: 72,
                                  background: '#f1f5f9',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {p.imageUrls?.[0] ? (
                                  <img
                                    src={p.imageUrls[0]}
                                    alt=""
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <span style={{ fontSize: 22 }}>📦</span>
                                )}
                              </div>
                              <div style={{ padding: '6px 8px' }}>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.25,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {p.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: PRIMARY,
                                    marginTop: 2,
                                  }}
                                >
                                  {p.currency} {p.price.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {m.from === 'bot' && m.paymentLink && (
                        <a
                          href={m.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: 8,
                            display: 'inline-block',
                            padding: '8px 14px',
                            borderRadius: 10,
                            background: PRIMARY,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                            boxShadow: '0 4px 10px rgba(249,115,22,0.25)',
                          }}
                        >
                          Pay {m.paymentAmount != null ? `${m.paymentCurrency || ''} ${m.paymentAmount}`.trim() : 'now'}{' '}
                          →
                        </a>
                      )}
                      <span
                        style={{
                          marginTop: 2,
                          fontSize: 10,
                          color: 'var(--text-faint)',
                        }}
                      >
                        {m.ts}
                      </span>
                      {/* Feedback for bot messages */}
                      {m.from === 'bot' && (
                        <div
                          style={{
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: 'var(--text-faint)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleHelpful(m.id, 'up')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color:
                                m.helpful === 'up'
                                  ? PRIMARY
                                  : 'var(--text-faint)',
                            }}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHelpful(m.id, 'down')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color:
                                m.helpful === 'down'
                                  ? PRIMARY
                                  : 'var(--text-faint)',
                            }}
                          >
                            👎
                          </button>
                          {m.helpful && (
                            <span style={{ fontSize: 10 }}>
                              Thanks! 😊
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action chips based on reply kind */}
                      {m.from === 'bot' && m.kind && (
                        <div
                          style={{
                            marginTop: 4,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          {m.kind === 'track' && (
                            <button
                              type="button"
                              onClick={() => navigate('/account?tab=orders')}
                              style={{
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'rgba(249,115,22,0.08)',
                                color: PRIMARY,
                                boxShadow:
                                  'inset 0 0 0 1px rgba(249,115,22,0.35)',
                              }}
                            >
                              📦 Go to My Orders →
                            </button>
                          )}
                          {m.kind === 'return' && (
                            <button
                              type="button"
                              onClick={() => navigate('/account?tab=returns')}
                              style={{
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'rgba(249,115,22,0.08)',
                                color: PRIMARY,
                                boxShadow:
                                  'inset 0 0 0 1px rgba(249,115,22,0.35)',
                              }}
                            >
                              ↩ Start a Return →
                            </button>
                          )}
                          {m.kind === 'seller' && (
                            <button
                              type="button"
                              onClick={() => navigate('/seller')}
                              style={{
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'rgba(249,115,22,0.08)',
                                color: PRIMARY,
                                boxShadow:
                                  'inset 0 0 0 1px rgba(249,115,22,0.35)',
                              }}
                            >
                              🏪 Become a Seller →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Quick chips */}
              <div
                style={{
                  marginTop: 4,
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 4,
                }}
              >
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipClick(chip.payload)}
                    style={{
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      border: 'none',
                      cursor: 'pointer',
                      background: 'rgba(249,115,22,0.08)',
                      color: PRIMARY,
                      boxShadow:
                        'inset 0 0 0 1px rgba(249,115,22,0.25)',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div ref={listEndRef} />

              {/* Scroll-to-bottom button */}
              <AnimatePresence>
                {showScrollDown && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={() => scrollToBottom()}
                    style={{
                      position: 'absolute',
                      right: 20,
                      bottom: 12,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: 'none',
                      background: PRIMARY,
                      color: '#ffffff',
                      fontSize: 16,
                      boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    ↓
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Input area */}
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--card-bg)',
                boxShadow: '0 -1px 0 var(--divider)',
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your question..."
                  rows={1}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    maxHeight: 90,
                    resize: 'none',
                    borderRadius: 12,
                    border: 'none',
                    padding: '10px 14px',
                    fontSize: 13,
                    outline: 'none',
                    background: 'var(--bg-secondary)',
                    boxShadow:
                      '0 0 0 1.5px rgba(0,0,0,0.08)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    cursor: input.trim() ? 'pointer' : 'default',
                    background: input.trim()
                      ? 'linear-gradient(135deg,#f97316,#ea580c)'
                      : 'var(--bg-tertiary)',
                    color: input.trim() ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: input.trim()
                      ? '0 4px 12px rgba(249,115,22,0.35)'
                      : 'none',
                    fontSize: 16,
                  }}
                >
                  ➤
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

