import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  stock?: number;
  statusLabel?: string;
}

type AssistantPaymentProvider = 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel';

interface ChatMessage {
  id: string;
  from: Sender;
  text: string;
  ts: string;
  helpful?: 'up' | 'down' | null;
  productCards?: ProductCard[];
  /** From agent: one strong match vs many */
  productLayout?: 'single' | 'grid';
  orderNumber?: string;
  orderIdForPayment?: string;
  paymentLink?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentProvider?: AssistantPaymentProvider;
  paymentReferenceId?: string;
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

  /** Inline checkout when user taps Buy now (IDs stay in state — never typed by user). */
  const [checkoutTarget, setCheckoutTarget] = useState<ProductCard | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    quantity: 1,
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    shippingSpeed: 'standard' as 'standard' | 'express' | 'international',
    momoWallet: '',
    airtelWallet: '',
  });
  const [checkoutGateways, setCheckoutGateways] = useState({
    flutterwave: false,
    mtn_momo: false,
    stripe: false,
    paypal: false,
    airtel_money: false,
  });
  const [checkoutPaymentProvider, setCheckoutPaymentProvider] = useState<AssistantPaymentProvider>('flutterwave');
  const [gwLoaded, setGwLoaded] = useState(false);

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

  useEffect(() => {
    if (!checkoutTarget) {
      setGwLoaded(false);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/public/payment-gateways?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { gateways?: Array<{ key: string; isEnabled: boolean }> }) => {
        if (cancelled) return;
        const next = {
          flutterwave: false,
          mtn_momo: false,
          stripe: false,
          paypal: false,
          airtel_money: false,
        };
        (d.gateways || []).forEach((x) => {
          if (x?.key && x.isEnabled === true) (next as Record<string, boolean>)[x.key] = true;
        });
        setCheckoutGateways(next);
        const order: AssistantPaymentProvider[] = ['flutterwave', 'stripe', 'paypal', 'momo', 'airtel'];
        const enabled = (k: AssistantPaymentProvider) => {
          if (k === 'momo') return next.mtn_momo;
          if (k === 'airtel') return next.airtel_money;
          return (next as Record<string, boolean>)[k];
        };
        const first = order.find(enabled);
        if (first) setCheckoutPaymentProvider(first);
        setGwLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutGateways({
            flutterwave: true,
            mtn_momo: false,
            stripe: false,
            paypal: false,
            airtel_money: false,
          });
          setCheckoutPaymentProvider('flutterwave');
          setGwLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutTarget]);

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

  const submitInlineCheckout = async () => {
    if (!checkoutTarget || checkoutBusy) return;
    const token = localStorage.getItem('auth_token');
    if (!token) {
      addMessage(
        'bot',
        'Please sign in as a buyer to complete checkout. You can log in and open the assistant again.',
      );
      return;
    }
    const f = checkoutForm;
    if (!f.fullName.trim() || !f.phone.trim() || !f.addressLine1.trim() || !f.city.trim() || !f.postalCode.trim() || !f.country.trim()) {
      addMessage('bot', 'Please fill in all required shipping fields before paying.');
      return;
    }
    const anyGw =
      checkoutGateways.flutterwave ||
      checkoutGateways.mtn_momo ||
      checkoutGateways.stripe ||
      checkoutGateways.paypal ||
      checkoutGateways.airtel_money;
    if (!anyGw && gwLoaded) {
      addMessage('bot', 'No payment method is enabled right now. Please try again later or use the main checkout.');
      return;
    }
    const gwEnabled = (k: AssistantPaymentProvider) => {
      if (k === 'momo') return checkoutGateways.mtn_momo;
      if (k === 'airtel') return checkoutGateways.airtel_money;
      return (checkoutGateways as Record<string, boolean>)[k];
    };
    if (!gwEnabled(checkoutPaymentProvider)) {
      addMessage('bot', 'That payment method is not available. Choose another option in the payment row.');
      return;
    }
    if (checkoutPaymentProvider === 'momo') {
      const w = (f.momoWallet || f.phone || '').trim();
      if (!w) {
        addMessage('bot', 'Enter the MTN MoMo number that will approve the payment (or put it in the MoMo field).');
        return;
      }
    }
    if (checkoutPaymentProvider === 'airtel') {
      const w = (f.airtelWallet || f.phone || '').trim();
      if (!w) {
        addMessage('bot', 'Enter the Airtel Money number that will approve the payment (or put it in the Airtel field).');
        return;
      }
    }
    setCheckoutBusy(true);
    try {
      const r = await fetch(`${API_BASE_URL}/ai/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: checkoutTarget.id,
          quantity: Math.max(1, Math.min(99, checkoutForm.quantity || 1)),
          fullName: f.fullName.trim(),
          phone: f.phone.trim(),
          addressLine1: f.addressLine1.trim(),
          city: f.city.trim(),
          state: f.state.trim(),
          postalCode: f.postalCode.trim(),
          country: f.country.trim(),
          shippingSpeed: f.shippingSpeed,
          paymentProvider: checkoutPaymentProvider,
          momoPhone: checkoutPaymentProvider === 'momo' ? (f.momoWallet || f.phone).trim() : undefined,
          airtelPhone: checkoutPaymentProvider === 'airtel' ? (f.airtelWallet || f.phone).trim() : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        addMessage('bot', String(data?.message || 'Checkout could not be completed.'));
        scrollToBottom();
        return;
      }
      const orderNumber = data?.orderNumber ? String(data.orderNumber) : undefined;
      const paymentLink = data?.paymentLink ? String(data.paymentLink) : undefined;
      const amount = data?.amount != null ? Number(data.amount) : undefined;
      const currency = data?.currency ? String(data.currency) : checkoutTarget.currency;
      const provider = data?.provider as AssistantPaymentProvider | undefined;
      const referenceId = data?.referenceId != null ? String(data.referenceId) : undefined;
      const orderIdPay = data?.orderId != null ? String(data.orderId) : undefined;

      if (paymentLink) {
        addMessage(
          'bot',
          orderNumber
            ? `Your order ${orderNumber} is ready. Use Pay now to complete payment securely.`
            : 'Your order is ready. Use Pay now to complete payment securely.',
          {
            orderNumber,
            orderIdForPayment: orderIdPay,
            paymentLink,
            paymentAmount: amount,
            paymentCurrency: currency,
            paymentProvider: provider,
          },
        );
      } else if (referenceId && orderIdPay && (provider === 'momo' || provider === 'airtel')) {
        addMessage(
          'bot',
          orderNumber
            ? `Your order ${orderNumber} is created. Approve the payment on your phone when prompted, or open the status page below.`
            : 'Order created. Approve the payment on your phone when prompted, or open the status page below.',
          {
            orderNumber,
            orderIdForPayment: orderIdPay,
            paymentAmount: amount,
            paymentCurrency: currency || 'RWF',
            paymentProvider: provider,
            paymentReferenceId: referenceId,
          },
        );
      } else {
        addMessage('bot', String(data?.message || 'Order created; payment could not be started automatically.'), {
          orderNumber,
          orderIdForPayment: orderIdPay,
        });
      }
      setCheckoutTarget(null);
      scrollToBottom();
    } catch {
      addMessage('bot', 'Could not reach checkout. Try again in a moment.');
    } finally {
      setCheckoutBusy(false);
    }
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
            stock: p.stock != null ? Number(p.stock) : undefined,
            statusLabel: p.statusLabel ? String(p.statusLabel) : undefined,
          }))
        : undefined;

      const checkout = data?.checkout as
        | {
            orderNumber?: string;
            orderId?: string;
            paymentLink?: string;
            amount?: number;
            currency?: string;
            provider?: AssistantPaymentProvider;
            referenceId?: string;
          }
        | undefined;

      const paymentLink: string | undefined =
        checkout?.paymentLink ??
        (data?.payment?.paymentLink ? String(data.payment.paymentLink) : undefined);

      const paymentAmount: number | undefined =
        checkout?.amount != null
          ? Number(checkout.amount)
          : data?.payment?.amount != null
            ? Number(data.payment.amount)
            : undefined;
      const paymentCurrency: string | undefined =
        checkout?.currency != null
          ? String(checkout.currency)
          : data?.payment?.currency
            ? String(data.payment.currency)
            : undefined;

      const orderNumber = checkout?.orderNumber ? String(checkout.orderNumber) : undefined;
      const orderIdForPayment = checkout?.orderId ? String(checkout.orderId) : undefined;
      const paymentProvider = checkout?.provider;
      const paymentReferenceId =
        checkout?.referenceId != null ? String(checkout.referenceId) : undefined;

      const productLayout =
        data?.productLayout === 'single' && products?.length === 1 ? 'single' : products?.length ? 'grid' : undefined;

      addMessage('bot', reply, {
        productCards: products?.length ? products : undefined,
        productLayout,
        orderNumber,
        orderIdForPayment,
        paymentLink,
        paymentAmount,
        paymentCurrency,
        paymentProvider,
        paymentReferenceId,
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
                const layout = m.productLayout === 'single' && m.productCards?.length === 1 ? 'single' : 'grid';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                      marginBottom: 12,
                    }}
                  >
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
                      <div style={{ width: '100%', marginTop: 10 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                            justifyContent: layout === 'single' ? 'center' : 'flex-start',
                          }}
                        >
                          {m.productCards.map((p) => {
                            const single = layout === 'single';
                            const cardW = single ? '100%' : 140;
                            const imgH = single ? 140 : 74;
                            return (
                              <div
                                key={p.id}
                                style={{
                                  width: single ? '100%' : 140,
                                  maxWidth: single ? 320 : cardW,
                                  borderRadius: 14,
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--card-bg)',
                                  overflow: 'hidden',
                                  boxShadow: single ? '0 8px 24px rgba(2,6,23,0.08)' : undefined,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => navigate(`/products/${p.id}`)}
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    textAlign: 'left',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: imgH,
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
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: 28 }}>📦</span>
                                    )}
                                  </div>
                                  <div style={{ padding: '8px 10px' }}>
                                    <div
                                      style={{
                                        fontSize: single ? 12.5 : 11,
                                        fontWeight: 800,
                                        color: 'var(--text-primary)',
                                        lineHeight: 1.25,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                    >
                                      {p.name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: PRIMARY,
                                        marginTop: 4,
                                        fontWeight: 800,
                                      }}
                                    >
                                      {p.currency} {p.price.toFixed(2)}
                                    </div>
                                    {p.statusLabel && (
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {p.statusLabel}
                                        {p.stock != null ? ` · ${p.stock} left` : ''}
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 8,
                                    padding: '0 10px 10px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCheckoutTarget(p);
                                      setOpen(true);
                                    }}
                                    style={{
                                      flex: 1,
                                      minWidth: 100,
                                      padding: '8px 10px',
                                      borderRadius: 12,
                                      border: 'none',
                                      cursor: 'pointer',
                                      background: `linear-gradient(135deg,${PRIMARY},#ea580c)`,
                                      color: '#fff',
                                      fontWeight: 800,
                                      fontSize: 11.5,
                                    }}
                                  >
                                    Buy now
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/products/${p.id}`)}
                                    style={{
                                      flex: 1,
                                      minWidth: 100,
                                      padding: '8px 10px',
                                      borderRadius: 12,
                                      border: '1px solid var(--border-subtle)',
                                      cursor: 'pointer',
                                      background: 'var(--card-bg-subtle)',
                                      color: 'var(--text-primary)',
                                      fontWeight: 700,
                                      fontSize: 11.5,
                                    }}
                                  >
                                    View product
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!isUser && m.orderNumber && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}
                      >
                        Order ref: {m.orderNumber}
                      </div>
                    )}
                    {!isUser && m.paymentLink && (
                      <div
                        style={{
                          width: '100%',
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
                          Pay now
                          {m.paymentAmount != null
                            ? ` (${m.paymentCurrency === 'RWF' ? `RWF ${Math.round(Number(m.paymentAmount)).toLocaleString()}` : `${m.paymentCurrency || ''} ${Number(m.paymentAmount).toFixed(2)}`})`
                            : ''}
                        </a>
                      </div>
                    )}
                    {!isUser &&
                      !m.paymentLink &&
                      m.paymentReferenceId &&
                      m.orderIdForPayment &&
                      (m.paymentProvider === 'momo' || m.paymentProvider === 'airtel') && (
                        <div style={{ width: '100%', marginTop: 10 }}>
                          <Link
                            to={`/checkout/momo-wait?ref=${encodeURIComponent(m.paymentReferenceId)}&orderId=${encodeURIComponent(m.orderIdForPayment)}&provider=${m.paymentProvider === 'airtel' ? 'airtel' : 'momo'}`}
                            style={{
                              display: 'inline-block',
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
                            Open payment status
                            {m.paymentAmount != null
                              ? ` (${m.paymentCurrency === 'RWF' ? `RWF ${Math.round(Number(m.paymentAmount)).toLocaleString()}` : `${m.paymentCurrency || ''} ${Number(m.paymentAmount).toFixed(2)}`})`
                              : ''}
                          </Link>
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

            {checkoutTarget && (
              <div
                style={{
                  padding: '10px 12px',
                  borderTop: '1px solid var(--divider)',
                  background: 'var(--card-bg-subtle)',
                  maxHeight: 380,
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--text-primary)' }}>
                    Checkout · {checkoutTarget.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutTarget(null)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 18,
                      color: 'var(--text-muted)',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Qty
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={checkoutForm.quantity}
                      onChange={(e) =>
                        setCheckoutForm((f) => ({
                          ...f,
                          quantity: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                        }))
                      }
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Phone
                    <input
                      value={checkoutForm.phone}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="Required"
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--text-muted)' }}>
                    Full name
                    <input
                      value={checkoutForm.fullName}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, fullName: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--text-muted)' }}>
                    Address line 1
                    <input
                      value={checkoutForm.addressLine1}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, addressLine1: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    City
                    <input
                      value={checkoutForm.city}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, city: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    State / region
                    <input
                      value={checkoutForm.state}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, state: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Postal code
                    <input
                      value={checkoutForm.postalCode}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, postalCode: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Country
                    <input
                      value={checkoutForm.country}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, country: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--text-muted)' }}>
                    Shipping
                    <select
                      value={checkoutForm.shippingSpeed}
                      onChange={(e) =>
                        setCheckoutForm((f) => ({
                          ...f,
                          shippingSpeed: e.target.value as typeof f.shippingSpeed,
                        }))
                      }
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="international">International</option>
                    </select>
                  </label>
                  <label style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--text-muted)' }}>
                    Payment (same as main checkout)
                    <select
                      value={checkoutPaymentProvider}
                      onChange={(e) =>
                        setCheckoutPaymentProvider(e.target.value as AssistantPaymentProvider)
                      }
                      disabled={!gwLoaded}
                      style={{
                        width: '100%',
                        marginTop: 2,
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 8px',
                        fontSize: 12,
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {!gwLoaded && <option value="flutterwave">Loading payment options…</option>}
                      {gwLoaded &&
                        !checkoutGateways.flutterwave &&
                        !checkoutGateways.stripe &&
                        !checkoutGateways.paypal &&
                        !checkoutGateways.mtn_momo &&
                        !checkoutGateways.airtel_money && (
                          <option value="flutterwave">No payment gateway enabled</option>
                        )}
                      {checkoutGateways.flutterwave && (
                        <option value="flutterwave">Card / bank (Flutterwave)</option>
                      )}
                      {checkoutGateways.stripe && <option value="stripe">Stripe</option>}
                      {checkoutGateways.paypal && <option value="paypal">PayPal</option>}
                      {checkoutGateways.mtn_momo && <option value="momo">MTN MoMo (RWF)</option>}
                      {checkoutGateways.airtel_money && <option value="airtel">Airtel Money (RWF)</option>}
                    </select>
                  </label>
                  {checkoutPaymentProvider === 'momo' && (
                    <label style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--text-muted)' }}>
                      MTN MoMo wallet
                      <input
                        value={checkoutForm.momoWallet}
                        onChange={(e) => setCheckoutForm((f) => ({ ...f, momoWallet: e.target.value }))}
                        placeholder="Uses Phone if empty"
                        style={{
                          width: '100%',
                          marginTop: 2,
                          borderRadius: 8,
                          border: '1px solid var(--border-subtle)',
                          padding: '6px 8px',
                          fontSize: 12,
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </label>
                  )}
                  {checkoutPaymentProvider === 'airtel' && (
                    <label style={{ gridColumn: '1 / -1', fontSize: 10, color: 'var(--text-muted)' }}>
                      Airtel Money wallet
                      <input
                        value={checkoutForm.airtelWallet}
                        onChange={(e) => setCheckoutForm((f) => ({ ...f, airtelWallet: e.target.value }))}
                        placeholder="Uses Phone if empty"
                        style={{
                          width: '100%',
                          marginTop: 2,
                          borderRadius: 8,
                          border: '1px solid var(--border-subtle)',
                          padding: '6px 8px',
                          fontSize: 12,
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  disabled={checkoutBusy}
                  onClick={() => void submitInlineCheckout()}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: checkoutBusy ? 'not-allowed' : 'pointer',
                    background: checkoutBusy ? '#e5e7eb' : `linear-gradient(135deg,${PRIMARY},#ea580c)`,
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 12.5,
                  }}
                >
                  {checkoutBusy ? 'Creating order…' : 'Create order & start payment'}
                </button>
              </div>
            )}

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

