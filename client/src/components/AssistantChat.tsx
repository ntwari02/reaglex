import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/config';

type Sender = 'bot' | 'user';

interface ProductCard {
  id: string;
  name: string;
  price: number;
  currency: string;
  category?: string;
  imageUrls: string[];
}

interface ChatMessage {
  id: string;
  from: Sender;
  text: string;
  ts: string;
  helpful?: 'up' | 'down' | null;
  productCards?: ProductCard[];
  paymentLink?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
}

const STORAGE_KEY = 'reaglex_unified_assistant_chat';
const MAX_MESSAGES = 50;
const SEND_COOLDOWN_MS = 10_000;
const PRIMARY = '#f97316';

function inferKind(text: string): string {
  const t = (text || '').toLowerCase();
  if (t.includes('track') || t.includes('order')) return 'track';
  if (t.includes('return') || t.includes('refund')) return 'return';
  if (t.includes('ship')) return 'shipping';
  if (t.includes('payment') || t.includes('pay')) return 'payment';
  return 'default';
}

export default function AssistantChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Keep it visible on seller/admin pages too (Unified assistant).
  const isHidden =
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/verify-otp';

  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [poweredByModel, setPoweredByModel] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const [sendCooldownUntil, setSendCooldownUntil] = useState(0);
  const [cooldownTick, setCooldownTick] = useState(0);

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const lastUserMessageRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-MAX_MESSAGES));
          return;
        }
      }
    } catch {
      // ignore
    }

    setMessages([
      {
        id: 'welcome',
        from: 'bot',
        ts: 'Just now',
        text:
          "👋 Hi! I'm your REAGLEX assistant.\n\nAsk me about:\n- products and pricing\n- tracking / orders\n- shipping & returns (role-safe)\n",
      },
    ]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (sendCooldownUntil <= Date.now()) return;
    const t = window.setInterval(() => setCooldownTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [sendCooldownUntil]);

  useEffect(() => {
    if (open) {
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages.length]);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('reaglex:assistant:open', openHandler as EventListener);
    return () => {
      window.removeEventListener('reaglex:assistant:open', openHandler as EventListener);
    };
  }, []);

  const addMessage = (from: Sender, text: string, extras?: Partial<ChatMessage>) => {
    const msg: ChatMessage = {
      id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from,
      text,
      ts: 'Just now',
      ...extras,
    };
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    return msg;
  };

  const scrollToBottom = () => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || typing) return;
    if (Date.now() < sendCooldownUntil) return;
    setInput('');
    lastUserMessageRef.current = content;

    const userMsg = addMessage('user', content);
    setTyping(true);
    setFallbackNotice(false);

    try {
      const token = localStorage.getItem('auth_token');
      const body = {
        message: userMsg.text,
        currentPath: path,
        userToken: token || null,
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const requestJson = async (url: string) => {
        const r = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`assistant-failed:${r.status}`);
        return r.json();
      };

      // 1) Unified agent (tools + role guards)
      // 2) Backwards-compatible agent chat (/api/ai/chat) for payment/other flows
      // 3) Text-only assistant (/api/assistant/chat) as a last resort
      let data: any;
      try {
        data = await requestJson(`${API_BASE_URL}/ai/agent`);
      } catch {
        try {
          data = await requestJson(`${API_BASE_URL}/ai/chat`);
        } catch {
          data = await requestJson(`${API_BASE_URL}/assistant/chat`);
        }
      }

      const reply = String(data?.reply || '').trim() || 'How can I help you today?';

      const modelName = data?.model != null ? String(data.model) : '';
      if (modelName) setPoweredByModel(modelName);
      setFallbackNotice(!!data?.fallbackOccurred);

      setSendCooldownUntil(Date.now() + SEND_COOLDOWN_MS);

      const productsRaw = Array.isArray(data?.products) ? data.products : [];
      const products: ProductCard[] | undefined = productsRaw.length
        ? productsRaw.map((p: any) => ({
            id: String(p.id),
            name: String(p.name || ''),
            price: Number(p.price) || 0,
            currency: String(p.currency || 'USD'),
            category: p.category ? String(p.category) : undefined,
            imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : Array.isArray(p.images) ? p.images : [],
          }))
        : undefined;

      const paymentLink: string | undefined = data?.payment?.paymentLink
        ? String(data.payment.paymentLink)
        : undefined;

      const paymentAmount: number | undefined =
        data?.payment?.amount != null ? Number(data.payment.amount) : undefined;
      const paymentCurrency: string | undefined = data?.payment?.currency
        ? String(data.payment.currency)
        : undefined;

      addMessage('bot', reply, {
        productCards: products?.length ? products : undefined,
        paymentLink,
        paymentAmount,
        paymentCurrency,
      });
      scrollToBottom();
    } catch {
      const reply =
        "I'm having trouble reaching the AI agent right now.\n\nTry again, or ask about products, order tracking, or shipping.";
      addMessage('bot', reply);
      scrollToBottom();
      setPoweredByModel(null);
    } finally {
      setTyping(false);
    }
  };

  const cooldownRemainingSec = Math.max(
    0,
    Math.ceil((sendCooldownUntil - Date.now()) / 1000),
  );
  const sendDisabled =
    typing || !input.trim() || Date.now() < sendCooldownUntil;

  if (isHidden) return null;

  return (
    <div style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 9999 }}>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
            background: `linear-gradient(135deg,${PRIMARY},#ea580c)`,
            boxShadow: '0 10px 30px rgba(249,115,22,0.25)',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          🤖
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            style={{
              width: 360,
              maxWidth: '90vw',
              borderRadius: 18,
              border: '1px solid var(--border-subtle)',
              background: 'var(--card-bg)',
              boxShadow: '0 18px 60px rgba(2,6,23,0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--divider)',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(14,165,233,0.06))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: `linear-gradient(135deg,${PRIMARY},#ea580c)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                  }}
                >
                  🤖
                </div>
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-primary)' }}>
                    Unified Assistant
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    Role-aware actions
                  </div>
                  {poweredByModel && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        marginTop: 4,
                        fontWeight: 600,
                      }}
                    >
                      Powered by: {poweredByModel}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            {fallbackNotice && (
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  color: '#b45309',
                  background: 'rgba(251,191,36,0.15)',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                A fallback model was used so your request could complete.
              </div>
            )}

            <div
              ref={messagesRef}
              style={{
                maxHeight: 380,
                overflowY: 'auto',
                padding: '12px 12px 6px',
              }}
            >
              {messages.map((m) => {
                const isUser = m.from === 'user';
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '84%',
                        padding: isUser ? '10px 12px' : '12px 12px',
                        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: isUser ? `linear-gradient(135deg,${PRIMARY},#ea580c)` : 'var(--card-bg-subtle)',
                        color: isUser ? '#fff' : 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        fontSize: 12.5,
                        lineHeight: 1.35,
                        boxShadow: isUser ? '0 4px 12px rgba(249,115,22,0.2)' : 'none',
                      }}
                    >
                      {m.text}
                    </div>
                    {!isUser && m.productCards && m.productCards.length > 0 && (
                      <div style={{ width: '100%', paddingLeft: 10, marginTop: 10 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {m.productCards.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => navigate(`/products/${p.id}`)}
                              style={{
                                width: 140,
                                borderRadius: 12,
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--card-bg)',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textAlign: 'left',
                              }}
                            >
                              <div style={{ height: 74, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {p.imageUrls?.[0] ? (
                                  <img src={p.imageUrls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 22 }}>📦</span>
                                )}
                              </div>
                              <div style={{ padding: '6px 8px' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {p.name}
                                </div>
                                <div style={{ fontSize: 11, color: PRIMARY, marginTop: 2, fontWeight: 800 }}>
                                  {p.currency} {p.price.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {!isUser && m.paymentLink && (
                      <div
                        style={{
                          width: '100%',
                          paddingLeft: 10,
                          marginTop: 10,
                          display: 'flex',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <a
                          href={m.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: PRIMARY,
                            color: '#fff',
                            fontWeight: 900,
                            textDecoration: 'none',
                            boxShadow: '0 10px 30px rgba(249,115,22,0.25)',
                            fontSize: 12.5,
                          }}
                        >
                          Pay now{m.paymentAmount != null ? ` (${m.paymentCurrency || ''} ${m.paymentAmount})` : ''}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={listEndRef} />
              {typing && (
                <div style={{ padding: '8px 2px', color: 'var(--text-faint)', fontSize: 12 }}>
                  Thinking{'.'.repeat(inferKind(input).length % 3 + 1)}
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderTop: '1px solid var(--divider)' }}>
              {cooldownRemainingSec > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>
                  Send cooldown: {cooldownRemainingSec}s (you can keep typing)
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about products, orders, shipping..."
                  style={{
                    flex: 1,
                    minWidth: 120,
                    borderRadius: 14,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    outline: 'none',
                    fontSize: 12.5,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !sendDisabled) handleSend();
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sendDisabled}
                  title={sendDisabled && Date.now() < sendCooldownUntil ? 'Cooldown active' : 'Send'}
                  style={{
                    width: 48,
                    borderRadius: 14,
                    border: 'none',
                    cursor: sendDisabled ? 'not-allowed' : 'pointer',
                    background: sendDisabled ? '#e5e7eb' : `linear-gradient(135deg,${PRIMARY},#ea580c)`,
                    color: '#fff',
                    fontWeight: 900,
                  }}
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (lastUserMessageRef.current) setInput(lastUserMessageRef.current);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--card-bg-subtle)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

