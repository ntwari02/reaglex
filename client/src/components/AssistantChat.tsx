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
const CYAN = '#22d3ee';
const INDIGO = '#6366f1';

const QUICK_ACTIONS = [
  { emoji: '🔍', label: 'Find product', query: 'Show me popular products' },
  { emoji: '📦', label: 'Track order',  query: 'How do I track my order?' },
  { emoji: '🚚', label: 'Shipping',      query: 'What are the shipping options and costs?' },
  { emoji: '↩',  label: 'Returns',       query: 'What is the return & refund policy?' },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  from: 'bot',
  ts: 'Just now',
  text: "Hi there! 👋 I'm REAGLEX AI — your intelligent shopping assistant.\n\nI can help you with:\n· Finding the perfect product\n· Order tracking & status\n· Shipping & delivery info\n· Returns & refunds\n· Checkout & payments\n\nWhat can I help you with today?",
};

/* ── Gemini Icon ─────────────────────────────────────────────────────────── */
function GeminiIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke="url(#gemini-ring-assistant)" strokeWidth="1.1" opacity="0.6" />
      <path d="M12 2.4L14.4 8.9L21 11.4L14.4 13.9L12 20.4L9.6 13.9L3 11.4L9.6 8.9L12 2.4Z" fill="url(#gemini-gradient-assistant)" />
      <circle cx="12" cy="12" r="2.2" fill="url(#gemini-core-assistant)" />
      <path d="M12 5.3V7.1M12 16.9V18.7M5.3 12H7.1M16.9 12H18.7" stroke="url(#gemini-lines-assistant)" strokeWidth="1.05" strokeLinecap="round" opacity="0.9" />
      <defs>
        <radialGradient id="gemini-core-assistant" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(2.2)">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#67e8f9" />
        </radialGradient>
        <linearGradient id="gemini-ring-assistant" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="gemini-gradient-assistant" x1="1.5" y1="1.5" x2="22.5" y2="22.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="gemini-lines-assistant" x1="5.3" y1="5.3" x2="18.7" y2="18.7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Send icon ───────────────────────────────────────────────────────────── */
function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function AssistantChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isHidden =
    path === '/login' || path === '/signup' ||
    path === '/forgot-password' || path === '/reset-password' ||
    path === '/verify-otp';

  const [open,              setOpen]              = useState(false);
  const [typing,            setTyping]            = useState(false);
  const [input,             setInput]             = useState('');
  const [messages,          setMessages]          = useState<ChatMessage[]>([]);
  const [poweredByModel,    setPoweredByModel]    = useState<string | null>(null);
  const [fallbackNotice,    setFallbackNotice]    = useState(false);
  const [sendCooldownUntil, setSendCooldownUntil] = useState(0);
  const [cooldownTick,      setCooldownTick]      = useState(0);
  const [isMobileViewport,  setIsMobileViewport]  = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  const [checkoutTarget,         setCheckoutTarget]         = useState<ProductCard | null>(null);
  const [checkoutBusy,           setCheckoutBusy]           = useState(false);
  const [checkoutForm,           setCheckoutForm]           = useState({
    quantity: 1, fullName: '', phone: '', addressLine1: '',
    city: '', state: '', postalCode: '', country: '',
    shippingSpeed: 'standard' as 'standard' | 'express' | 'international',
    momoWallet: '', airtelWallet: '',
  });
  const [checkoutGateways, setCheckoutGateways] = useState({
    flutterwave: false, mtn_momo: false, stripe: false,
    paypal: false, airtel_money: false,
  });
  const [checkoutPaymentProvider, setCheckoutPaymentProvider] = useState<AssistantPaymentProvider>('flutterwave');
  const [gwLoaded, setGwLoaded] = useState(false);

  const messagesRef      = useRef<HTMLDivElement | null>(null);
  const listEndRef       = useRef<HTMLDivElement | null>(null);
  const lastUserMsgRef   = useRef('');
  const textareaRef      = useRef<HTMLTextAreaElement | null>(null);
  const chatWindowRef    = useRef<HTMLDivElement | null>(null);

  /* ── Persist / hydrate ── */
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
    } catch { /* ignore */ }
    setMessages([WELCOME_MESSAGE]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); }
    catch { /* ignore */ }
  }, [messages]);

  /* ── Cooldown ticker ── */
  useEffect(() => {
    if (sendCooldownUntil <= Date.now()) return;
    const t = window.setInterval(() => setCooldownTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [sendCooldownUntil]);
  void cooldownTick;

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (open) setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [open, messages.length]);

  /* ── External open event ── */
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener('reaglex:assistant:open', h as EventListener);
    return () => window.removeEventListener('reaglex:assistant:open', h as EventListener);
  }, []);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (chatWindowRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  /* ── Viewport breakpoint for floating position ── */
  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Inject styles & animations ── */
  useEffect(() => {
    const styleId = 'reaglex-ai-chat-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Trigger button */
      .ai-trigger-btn {
        position: relative; background: none; border: none; padding: 0; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        width: 58px; height: 58px;
      }
      .ai-trigger-core {
        width: 54px; height: 54px; border-radius: 50%;
        background: linear-gradient(145deg, #1a1a2e 0%, #0d0f1c 100%);
        border: 1.5px solid rgba(34,211,238,0.32);
        box-shadow: 0 0 18px rgba(34,211,238,0.18), 0 0 36px rgba(99,102,241,0.12), 0 8px 28px rgba(0,0,0,0.55);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.28s ease, box-shadow 0.28s ease;
      }
      .ai-trigger-core:hover { transform: translateY(-3px); box-shadow: 0 0 26px rgba(34,211,238,0.28), 0 0 48px rgba(99,102,241,0.18), 0 10px 36px rgba(0,0,0,0.55); }
      .ai-ring {
        position: absolute; border-radius: 50%;
        border: 1.5px solid rgba(34,211,238,0.22);
        animation: aiRingPulse 2.6s ease-out infinite; pointer-events: none;
        top: -5px; left: -5px; right: -5px; bottom: -5px;
      }
      .ai-ring-2 {
        top: -10px; left: -10px; right: -10px; bottom: -10px;
        border: 1px solid rgba(99,102,241,0.13);
        animation-delay: 0.9s;
      }
      @keyframes aiRingPulse {
        0%   { opacity: 0.75; transform: scale(1); }
        100% { opacity: 0;    transform: scale(1.45); }
      }

      /* Typing dots */
      .ai-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(34,211,238,0.7); animation: aiDot 1.3s ease-in-out infinite; }
      .ai-dot:nth-child(2) { animation-delay: 0.22s; }
      .ai-dot:nth-child(3) { animation-delay: 0.44s; }
      @keyframes aiDot {
        0%,60%,100% { transform: translateY(0);   opacity: 0.45; }
        30%          { transform: translateY(-7px); opacity: 1;    }
      }

      /* Quick-action chips */
      .ai-chip {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 6px 11px; border-radius: 99px;
        border: 1px solid var(--border-card);
        background: var(--bg-secondary);
        color: var(--text-secondary); font-size: 11.5px; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
      }
      .ai-chip:hover {
        background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.38);
        color: #f97316; transform: translateY(-1px);
      }

      /* Input textarea */
      .ai-textarea {
        flex: 1; min-width: 0;
        background: var(--bg-secondary); border: 1.5px solid var(--border-card);
        border-radius: 14px; color: var(--text-primary); font-size: 13px;
        padding: 10px 14px; outline: none; resize: none;
        min-height: 42px; max-height: 110px; font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.45;
      }
      .ai-textarea:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
      .ai-textarea::placeholder { color: var(--text-faint); }
      .ai-textarea::-webkit-scrollbar { width: 2px; }
      .ai-textarea::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.25); border-radius: 4px; }

      /* Send button */
      .ai-send {
        width: 42px; height: 42px; flex-shrink: 0; border-radius: 13px; border: none;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #f97316, #ea580c); color: #fff;
        box-shadow: 0 4px 14px rgba(249,115,22,0.38);
        transition: all 0.22s ease;
      }
      .ai-send:hover:not(:disabled) { box-shadow: 0 6px 22px rgba(249,115,22,0.52); transform: translateY(-1px); }
      .ai-send:disabled { background: var(--bg-tertiary, #e5e7eb); color: var(--text-faint); box-shadow: none; cursor: not-allowed; }

      /* Header action buttons */
      .ai-hdr-btn {
        width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.06); color: rgba(200,210,230,0.7);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 14px; line-height: 1; transition: all 0.18s ease; flex-shrink: 0;
      }
      .ai-hdr-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }
      .ai-hdr-btn-close:hover { background: rgba(239,68,68,0.28); color: #fca5a5; border-color: rgba(239,68,68,0.35); }

      /* Checkout inputs */
      .ai-ck-input {
        width: 100%; margin-top: 3px; border-radius: 10px;
        border: 1.5px solid var(--border-card); padding: 7px 10px; font-size: 12px;
        background: var(--bg-secondary); color: var(--text-primary); outline: none;
        font-family: inherit; transition: border-color 0.2s;
      }
      .ai-ck-input:focus { border-color: rgba(249,115,22,0.45); }
      .ai-ck-input::placeholder { color: var(--text-faint); }

      /* Scrollbar for messages area */
      .ai-msgs::-webkit-scrollbar { width: 3px; }
      .ai-msgs::-webkit-scrollbar-track { background: transparent; }
      .ai-msgs::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.22); border-radius: 99px; }
      .ai-msgs::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.4); }

      /* Animated icon (kept for GeminiIcon) */
      .gemini-animated-icon {
        animation: geminiFloatSpin 3.2s ease-in-out infinite, geminiPulseGlow 2.4s ease-in-out infinite;
        filter: drop-shadow(0 0 10px rgba(34,211,238,0.36)) drop-shadow(0 0 18px rgba(99,102,241,0.28));
        transform-origin: 50% 50%;
      }
      @keyframes geminiFloatSpin {
        0%   { transform: translateY(0)    rotate(0deg)  scale(1);    }
        50%  { transform: translateY(-2px) rotate(9deg)  scale(1.05); }
        100% { transform: translateY(0)    rotate(0deg)  scale(1);    }
      }
      @keyframes geminiPulseGlow {
        0%,100% { opacity: 0.88; }
        50%      { opacity: 1;    }
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  /* ── Payment gateways for inline checkout ── */
  useEffect(() => {
    if (!checkoutTarget) { setGwLoaded(false); return; }
    let cancelled = false;
    fetch(`${API_BASE_URL}/public/payment-gateways?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { gateways?: Array<{ key: string; isEnabled: boolean }> }) => {
        if (cancelled) return;
        const next = { flutterwave: false, mtn_momo: false, stripe: false, paypal: false, airtel_money: false };
        (d.gateways || []).forEach((x) => { if (x?.key && x.isEnabled) (next as Record<string, boolean>)[x.key] = true; });
        setCheckoutGateways(next);
        const order: AssistantPaymentProvider[] = ['flutterwave', 'stripe', 'paypal', 'momo', 'airtel'];
        const enabled = (k: AssistantPaymentProvider) => k === 'momo' ? next.mtn_momo : k === 'airtel' ? next.airtel_money : (next as Record<string, boolean>)[k];
        const first = order.find(enabled);
        if (first) setCheckoutPaymentProvider(first);
        setGwLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutGateways({ flutterwave: true, mtn_momo: false, stripe: false, paypal: false, airtel_money: false });
          setCheckoutPaymentProvider('flutterwave');
          setGwLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [checkoutTarget]);

  /* ── Helpers ── */
  const addMessage = (from: Sender, text: string, extras?: Partial<ChatMessage>) => {
    const msg: ChatMessage = { id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, from, text, ts: 'Just now', ...extras };
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    return msg;
  };

  const scrollToBottom = () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setPoweredByModel(null);
    setFallbackNotice(false);
    setCheckoutTarget(null);
    setInput('');
  };

  /* ── Inline checkout submit ── */
  const submitInlineCheckout = async () => {
    if (!checkoutTarget || checkoutBusy) return;
    const token = localStorage.getItem('auth_token');
    if (!token) { addMessage('bot', 'Please sign in as a buyer to complete checkout.'); return; }
    const f = checkoutForm;
    if (!f.fullName.trim() || !f.phone.trim() || !f.addressLine1.trim() || !f.city.trim() || !f.postalCode.trim() || !f.country.trim()) {
      addMessage('bot', 'Please fill in all required shipping fields before paying.'); return;
    }
    const anyGw = checkoutGateways.flutterwave || checkoutGateways.mtn_momo || checkoutGateways.stripe || checkoutGateways.paypal || checkoutGateways.airtel_money;
    if (!anyGw && gwLoaded) { addMessage('bot', 'No payment method is enabled right now.'); return; }
    const gwEnabled = (k: AssistantPaymentProvider) => k === 'momo' ? checkoutGateways.mtn_momo : k === 'airtel' ? checkoutGateways.airtel_money : (checkoutGateways as Record<string, boolean>)[k];
    if (!gwEnabled(checkoutPaymentProvider)) { addMessage('bot', 'That payment method is unavailable. Choose another.'); return; }
    if (checkoutPaymentProvider === 'momo' && !(f.momoWallet || f.phone).trim()) { addMessage('bot', 'Enter an MTN MoMo number.'); return; }
    if (checkoutPaymentProvider === 'airtel' && !(f.airtelWallet || f.phone).trim()) { addMessage('bot', 'Enter an Airtel Money number.'); return; }
    setCheckoutBusy(true);
    try {
      const r = await fetch(`${API_BASE_URL}/ai/checkout`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: checkoutTarget.id,
          quantity: Math.max(1, Math.min(99, f.quantity || 1)),
          fullName: f.fullName.trim(), phone: f.phone.trim(),
          addressLine1: f.addressLine1.trim(), city: f.city.trim(),
          state: f.state.trim(), postalCode: f.postalCode.trim(), country: f.country.trim(),
          shippingSpeed: f.shippingSpeed, paymentProvider: checkoutPaymentProvider,
          momoPhone: checkoutPaymentProvider === 'momo' ? (f.momoWallet || f.phone).trim() : undefined,
          airtelPhone: checkoutPaymentProvider === 'airtel' ? (f.airtelWallet || f.phone).trim() : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) { addMessage('bot', String(data?.message || 'Checkout could not be completed.')); scrollToBottom(); return; }
      const orderNumber = data?.orderNumber ? String(data.orderNumber) : undefined;
      const paymentLink = data?.paymentLink ? String(data.paymentLink) : undefined;
      const amount = data?.amount != null ? Number(data.amount) : undefined;
      const currency = data?.currency ? String(data.currency) : checkoutTarget.currency;
      const provider = data?.provider as AssistantPaymentProvider | undefined;
      const referenceId = data?.referenceId != null ? String(data.referenceId) : undefined;
      const orderIdPay = data?.orderId != null ? String(data.orderId) : undefined;
      if (paymentLink) {
        addMessage('bot', orderNumber ? `Order ${orderNumber} ready — tap Pay now to complete payment.` : 'Your order is ready — tap Pay now.', { orderNumber, orderIdForPayment: orderIdPay, paymentLink, paymentAmount: amount, paymentCurrency: currency, paymentProvider: provider });
      } else if (referenceId && orderIdPay && (provider === 'momo' || provider === 'airtel')) {
        addMessage('bot', orderNumber ? `Order ${orderNumber} created — approve the payment prompt on your phone.` : 'Order created — approve the payment on your phone.', { orderNumber, orderIdForPayment: orderIdPay, paymentAmount: amount, paymentCurrency: currency || 'RWF', paymentProvider: provider, paymentReferenceId: referenceId });
      } else {
        addMessage('bot', String(data?.message || 'Order created; payment could not be started automatically.'), { orderNumber, orderIdForPayment: orderIdPay });
      }
      setCheckoutTarget(null);
      scrollToBottom();
    } catch {
      addMessage('bot', 'Could not reach checkout. Try again in a moment.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  /* ── Send message ── */
  const handleSend = async () => {
    const content = input.trim();
    if (!content || typing || Date.now() < sendCooldownUntil) return;
    setInput('');
    lastUserMsgRef.current = content;
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const userMsg = addMessage('user', content);
    setTyping(true);
    setFallbackNotice(false);
    try {
      const token = localStorage.getItem('auth_token');
      const body = { message: userMsg.text, currentPath: path, userToken: token || null };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const req = async (url: string) => {
        const r = await fetch(url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      };
      let data: any;
      try { data = await req(`${API_BASE_URL}/ai/agent`); }
      catch { try { data = await req(`${API_BASE_URL}/ai/chat`); } catch { data = await req(`${API_BASE_URL}/assistant/chat`); } }
      const reply = String(data?.reply || '').trim() || 'How can I help you today?';
      if (data?.model) setPoweredByModel(String(data.model));
      setFallbackNotice(!!data?.fallbackOccurred);
      setSendCooldownUntil(Date.now() + SEND_COOLDOWN_MS);
      const productsRaw = Array.isArray(data?.products) ? data.products : [];
      const products: ProductCard[] | undefined = productsRaw.length
        ? productsRaw.map((p: any) => ({ id: String(p.id), name: String(p.name || ''), price: Number(p.price) || 0, currency: String(p.currency || 'USD'), category: p.category ? String(p.category) : undefined, imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : Array.isArray(p.images) ? p.images : [], stock: p.stock != null ? Number(p.stock) : undefined, statusLabel: p.statusLabel ? String(p.statusLabel) : undefined }))
        : undefined;
      const checkout = data?.checkout as { orderNumber?: string; orderId?: string; paymentLink?: string; amount?: number; currency?: string; provider?: AssistantPaymentProvider; referenceId?: string; } | undefined;
      const paymentLink = checkout?.paymentLink ?? (data?.payment?.paymentLink ? String(data.payment.paymentLink) : undefined);
      const paymentAmount = checkout?.amount != null ? Number(checkout.amount) : data?.payment?.amount != null ? Number(data.payment.amount) : undefined;
      const paymentCurrency = checkout?.currency != null ? String(checkout.currency) : data?.payment?.currency ? String(data.payment.currency) : undefined;
      const orderNumber = checkout?.orderNumber ? String(checkout.orderNumber) : undefined;
      const orderIdForPayment = checkout?.orderId ? String(checkout.orderId) : undefined;
      const paymentProvider = checkout?.provider;
      const paymentReferenceId = checkout?.referenceId != null ? String(checkout.referenceId) : undefined;
      const productLayout = data?.productLayout === 'single' && products?.length === 1 ? 'single' : products?.length ? 'grid' : undefined;
      addMessage('bot', reply, { productCards: products?.length ? products : undefined, productLayout, orderNumber, orderIdForPayment, paymentLink, paymentAmount, paymentCurrency, paymentProvider, paymentReferenceId });
      scrollToBottom();
    } catch {
      addMessage('bot', "I'm having trouble reaching the AI agent right now.\n\nTry again, or ask about products, order tracking, or shipping.");
      scrollToBottom();
      setPoweredByModel(null);
    } finally {
      setTyping(false);
    }
  };

  const cooldownSec = Math.max(0, Math.ceil((sendCooldownUntil - Date.now()) / 1000));
  const sendDisabled = typing || !input.trim() || Date.now() < sendCooldownUntil;

  /* ── Auto-resize textarea ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  };

  if (isHidden) return null;

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobileViewport ? 'calc(82px + env(safe-area-inset-bottom))' : 20,
        right: isMobileViewport ? 12 : 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
      }}
    >

      {/* ── Trigger orb ── */}
      {!open && (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          className="ai-trigger-btn"
          aria-label="Open AI assistant"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
          whileTap={{ scale: 0.92 }}
        >
          <span className="ai-ring" />
          <span className="ai-ring ai-ring-2" />
          <span className="ai-trigger-core">
            <GeminiIcon size={26} className="gemini-animated-icon" />
          </span>
        </motion.button>
      )}

      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-chat-window"
            ref={chatWindowRef}
            initial={{ opacity: 0, scale: 0.88, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{
              width: 400,
              maxWidth: '92vw',
              borderRadius: 22,
              overflow: 'hidden',
              background: 'var(--card-bg)',
              border: `1px solid rgba(34,211,238,0.18)`,
              boxShadow: '0 28px 80px rgba(0,0,0,0.38), 0 0 0 1px rgba(34,211,238,0.07), 0 0 60px rgba(99,102,241,0.06)',
              position: 'relative',
            }}
          >
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, ${CYAN} 30%, ${PRIMARY} 70%, transparent 100%)`, zIndex: 10 }} />

            {/* ── Header ── */}
            <div style={{
              padding: '13px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              background: 'linear-gradient(135deg, rgba(10,10,22,0.98) 0%, rgba(13,15,28,0.97) 100%)',
              borderBottom: `1px solid rgba(34,211,238,0.1)`,
              position: 'relative', zIndex: 2,
            }}>
              {/* Left: icon + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 13,
                    background: `linear-gradient(145deg, rgba(34,211,238,0.14) 0%, rgba(99,102,241,0.1) 100%)`,
                    border: `1px solid rgba(34,211,238,0.28)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GeminiIcon size={21} className="gemini-animated-icon" />
                  </div>
                  {/* Online dot */}
                  <span style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#22c55e', border: '2px solid #0d0f1c',
                    boxShadow: '0 0 7px rgba(34,197,94,0.65)',
                  }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#f0f4ff', letterSpacing: '0.025em', lineHeight: 1 }}>
                    REAGLEX AI
                  </div>
                  <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, color: '#4ade80', fontWeight: 700 }}>● Online</span>
                    {poweredByModel && (
                      <>
                        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)' }}>·</span>
                        <span style={{ fontSize: 10, color: `rgba(34,211,238,0.72)`, fontWeight: 600, letterSpacing: '0.02em' }}>{poweredByModel}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <button type="button" className="ai-hdr-btn" title="Clear chat" onClick={clearChat}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
                <button type="button" className="ai-hdr-btn ai-hdr-btn-close" title="Close" onClick={() => setOpen(false)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Fallback notice */}
            {fallbackNotice && (
              <div style={{ padding: '7px 14px', fontSize: 11, color: '#b45309', background: 'rgba(251,191,36,0.12)', borderBottom: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚡</span> A fallback model was used to complete your request.
              </div>
            )}

            {/* ── Messages area ── */}
            <div
              ref={messagesRef}
              className="ai-msgs"
              style={{ maxHeight: 420, overflowY: 'auto', padding: '14px 14px 8px', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', gap: 0 }}
            >
              {/* Quick action chips — only before any user message */}
              {messages.length <= 1 && !checkoutTarget && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 8 }}>Quick actions</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {QUICK_ACTIONS.map((a) => (
                      <button key={a.label} type="button" className="ai-chip"
                        onClick={() => { setInput(a.query); textareaRef.current?.focus(); }}>
                        <span>{a.emoji}</span>{a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((m) => {
                const isUser = m.from === 'user';
                const layout = m.productLayout === 'single' && m.productCards?.length === 1 ? 'single' : 'grid';
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 14, width: '100%' }}>
                    {/* Bubble row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '88%', justifyContent: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
                      {!isUser && (
                        <div style={{ width: 26, height: 26, borderRadius: 9, background: `linear-gradient(145deg, rgba(34,211,238,0.14) 0%, rgba(99,102,241,0.1) 100%)`, border: '1px solid rgba(34,211,238,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                          <GeminiIcon size={13} className="gemini-animated-icon" />
                        </div>
                      )}
                      <div style={{
                        padding: isUser ? '9px 13px' : '10px 13px',
                        borderRadius: isUser ? '17px 4px 17px 17px' : '4px 17px 17px 17px',
                        background: isUser
                          ? `linear-gradient(135deg, ${PRIMARY} 0%, #ea580c 100%)`
                          : 'var(--card-bg)',
                        color: isUser ? '#fff' : 'var(--text-primary)',
                        fontSize: 13, lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        boxShadow: isUser
                          ? '0 4px 14px rgba(249,115,22,0.22)'
                          : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px var(--border-card)',
                        maxWidth: '100%',
                      }}>
                        {m.text}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 3, paddingLeft: isUser ? 0 : 34, paddingRight: isUser ? 2 : 0 }}>
                      {m.ts}
                    </span>

                    {/* Product cards */}
                    {!isUser && m.productCards && m.productCards.length > 0 && (
                      <div style={{ width: '100%', marginTop: 10, paddingLeft: 34 }}>
                        <div style={{ display: 'flex', flexWrap: layout === 'single' ? 'nowrap' : 'wrap', gap: 8, justifyContent: layout === 'single' ? 'stretch' : 'flex-start' }}>
                          {m.productCards.map((p) => {
                            const single = layout === 'single';
                            return (
                              <div key={p.id} style={{
                                width: single ? '100%' : 142, flexShrink: 0,
                                borderRadius: 14, overflow: 'hidden',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-card)',
                                boxShadow: single ? '0 6px 24px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                              }}>
                                {/* Image */}
                                <button type="button" onClick={() => navigate(`/products/${p.id}`)}
                                  style={{ width: '100%', border: 'none', padding: 0, cursor: 'pointer', background: 'none', display: 'block', textAlign: 'left' }}>
                                  <div style={{ height: single ? 150 : 80, background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
                                    {p.imageUrls?.[0]
                                      ? <img src={p.imageUrls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                      : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📦</span>
                                    }
                                    {/* Price badge */}
                                    <div style={{ position: 'absolute', top: 6, right: 6, padding: '3px 7px', borderRadius: 8, background: 'rgba(0,0,0,0.72)', color: PRIMARY, fontWeight: 800, fontSize: 10.5, backdropFilter: 'blur(4px)' }}>
                                      {p.currency} {p.price.toFixed(2)}
                                    </div>
                                  </div>
                                  <div style={{ padding: '8px 10px 4px' }}>
                                    <div style={{ fontSize: single ? 12.5 : 11.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                      {p.name}
                                    </div>
                                    {p.statusLabel && (
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                                        {p.statusLabel}{p.stock != null ? ` · ${p.stock} left` : ''}
                                      </div>
                                    )}
                                  </div>
                                </button>
                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6, padding: '0 10px 10px', flexWrap: 'wrap' }}>
                                  <button type="button"
                                    onClick={() => { setCheckoutTarget(p); setOpen(true); }}
                                    style={{ flex: 1, minWidth: 80, padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${PRIMARY},#ea580c)`, color: '#fff', fontWeight: 800, fontSize: 11, boxShadow: '0 3px 10px rgba(249,115,22,0.3)' }}>
                                    Buy now
                                  </button>
                                  <button type="button"
                                    onClick={() => navigate(`/products/${p.id}`)}
                                    style={{ flex: 1, minWidth: 80, padding: '7px 8px', borderRadius: 10, border: '1px solid var(--border-card)', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Order reference */}
                    {!isUser && m.orderNumber && (
                      <div style={{ marginTop: 6, paddingLeft: 34, fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: '#22c55e' }}>✓</span> Order #{m.orderNumber}
                      </div>
                    )}

                    {/* Pay now link */}
                    {!isUser && m.paymentLink && (
                      <div style={{ marginTop: 8, paddingLeft: 34 }}>
                        <a href={m.paymentLink} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: `linear-gradient(135deg,${PRIMARY},#ea580c)`, color: '#fff', fontWeight: 800, textDecoration: 'none', fontSize: 12.5, boxShadow: '0 6px 20px rgba(249,115,22,0.3)' }}>
                          🔒 Pay now{m.paymentAmount != null ? ` (${m.paymentCurrency === 'RWF' ? `RWF ${Math.round(Number(m.paymentAmount)).toLocaleString()}` : `${m.paymentCurrency || ''} ${Number(m.paymentAmount).toFixed(2)}`})` : ''}
                        </a>
                      </div>
                    )}

                    {/* Momo / airtel payment status */}
                    {!isUser && !m.paymentLink && m.paymentReferenceId && m.orderIdForPayment && (m.paymentProvider === 'momo' || m.paymentProvider === 'airtel') && (
                      <div style={{ marginTop: 8, paddingLeft: 34 }}>
                        <Link to={`/checkout/momo-wait?ref=${encodeURIComponent(m.paymentReferenceId)}&orderId=${encodeURIComponent(m.orderIdForPayment)}&provider=${m.paymentProvider === 'airtel' ? 'airtel' : 'momo'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: `linear-gradient(135deg,${PRIMARY},#ea580c)`, color: '#fff', fontWeight: 800, textDecoration: 'none', fontSize: 12.5, boxShadow: '0 6px 20px rgba(249,115,22,0.3)' }}>
                          📱 Payment status{m.paymentAmount != null ? ` (${m.paymentCurrency === 'RWF' ? `RWF ${Math.round(Number(m.paymentAmount)).toLocaleString()}` : `${m.paymentCurrency || ''} ${Number(m.paymentAmount).toFixed(2)}`})` : ''}
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingLeft: 2 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 9, background: `linear-gradient(145deg, rgba(34,211,238,0.14) 0%, rgba(99,102,241,0.1) 100%)`, border: '1px solid rgba(34,211,238,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GeminiIcon size={13} className="gemini-animated-icon" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 13px', borderRadius: '4px 17px 17px 17px', background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
                  </div>
                </div>
              )}

              <div ref={listEndRef} />
            </div>

            {/* ── Inline checkout panel ── */}
            {checkoutTarget && (
              <div style={{ borderTop: '1px solid var(--divider)', background: 'var(--bg-secondary)', maxHeight: 380, overflowY: 'auto', padding: '12px 14px' }}>
                {/* Checkout header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--text-primary)' }}>Checkout</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{checkoutTarget.name}</div>
                  </div>
                  <button type="button" onClick={() => setCheckoutTarget(null)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-tertiary, #e5e7eb)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
                {/* Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                  {[
                    { label: 'Full name', key: 'fullName', col: '1/-1', placeholder: 'Required' },
                    { label: 'Phone',     key: 'phone',    placeholder: 'Required' },
                    { label: 'Qty',       key: 'quantity', type: 'number', min: '1', max: '99' },
                    { label: 'Address',   key: 'addressLine1', col: '1/-1', placeholder: 'Street address' },
                    { label: 'City',      key: 'city' },
                    { label: 'State',     key: 'state',    placeholder: 'State / region' },
                    { label: 'Postal',    key: 'postalCode' },
                    { label: 'Country',   key: 'country' },
                  ].map(({ label, key, col, type, placeholder, min, max }) => (
                    <label key={key} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', gridColumn: col }}>
                      {label}
                      <input
                        type={type || 'text'}
                        min={min} max={max}
                        placeholder={placeholder}
                        className="ai-ck-input"
                        value={String((checkoutForm as any)[key])}
                        onChange={(e) => setCheckoutForm((f) => ({ ...f, [key]: type === 'number' ? Math.max(1, Math.min(99, Number(e.target.value) || 1)) : e.target.value }))}
                      />
                    </label>
                  ))}
                  {/* Shipping */}
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', gridColumn: '1/-1' }}>
                    Shipping
                    <select value={checkoutForm.shippingSpeed}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, shippingSpeed: e.target.value as typeof f.shippingSpeed }))}
                      className="ai-ck-input">
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="international">International</option>
                    </select>
                  </label>
                  {/* Payment */}
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', gridColumn: '1/-1' }}>
                    Payment
                    <select value={checkoutPaymentProvider} onChange={(e) => setCheckoutPaymentProvider(e.target.value as AssistantPaymentProvider)} disabled={!gwLoaded} className="ai-ck-input">
                      {!gwLoaded && <option value="flutterwave">Loading…</option>}
                      {gwLoaded && !checkoutGateways.flutterwave && !checkoutGateways.stripe && !checkoutGateways.paypal && !checkoutGateways.mtn_momo && !checkoutGateways.airtel_money && <option value="flutterwave">No gateway enabled</option>}
                      {checkoutGateways.flutterwave && <option value="flutterwave">Card / Bank (Flutterwave)</option>}
                      {checkoutGateways.stripe && <option value="stripe">Stripe</option>}
                      {checkoutGateways.paypal && <option value="paypal">PayPal</option>}
                      {checkoutGateways.mtn_momo && <option value="momo">MTN MoMo (RWF)</option>}
                      {checkoutGateways.airtel_money && <option value="airtel">Airtel Money (RWF)</option>}
                    </select>
                  </label>
                  {checkoutPaymentProvider === 'momo' && (
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', gridColumn: '1/-1' }}>
                      MoMo wallet
                      <input value={checkoutForm.momoWallet} onChange={(e) => setCheckoutForm((f) => ({ ...f, momoWallet: e.target.value }))} placeholder="Uses Phone if empty" className="ai-ck-input" />
                    </label>
                  )}
                  {checkoutPaymentProvider === 'airtel' && (
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', gridColumn: '1/-1' }}>
                      Airtel wallet
                      <input value={checkoutForm.airtelWallet} onChange={(e) => setCheckoutForm((f) => ({ ...f, airtelWallet: e.target.value }))} placeholder="Uses Phone if empty" className="ai-ck-input" />
                    </label>
                  )}
                </div>
                {/* Submit */}
                <button type="button" disabled={checkoutBusy} onClick={() => void submitInlineCheckout()}
                  style={{ marginTop: 12, width: '100%', padding: '11px 14px', borderRadius: 13, border: 'none', cursor: checkoutBusy ? 'not-allowed' : 'pointer', background: checkoutBusy ? 'var(--bg-tertiary, #e5e7eb)' : `linear-gradient(135deg,${PRIMARY},#ea580c)`, color: checkoutBusy ? 'var(--text-faint)' : '#fff', fontWeight: 800, fontSize: 13, boxShadow: checkoutBusy ? 'none' : '0 6px 20px rgba(249,115,22,0.32)', transition: 'all 0.2s' }}>
                  {checkoutBusy ? 'Creating order…' : '🔒 Create order & start payment'}
                </button>
              </div>
            )}

            {/* ── Input footer ── */}
            <div style={{ padding: '11px 14px 13px', borderTop: '1px solid var(--divider)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {/* Cooldown indicator */}
              {cooldownSec > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-faint)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Next message in {cooldownSec}s
                </div>
              )}

              {/* Input row */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about products, orders, shipping…"
                  className="ai-textarea"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !sendDisabled) { e.preventDefault(); void handleSend(); }
                  }}
                />
                <button type="button" onClick={() => void handleSend()} disabled={sendDisabled} className="ai-send"
                  title={sendDisabled && Date.now() < sendCooldownUntil ? 'Cooldown active' : 'Send (Enter)'}>
                  <SendIcon size={15} />
                </button>
              </div>

              {/* Retry + model */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {messages.some(m => m.from === 'user') ? (
                  <button type="button"
                    onClick={() => { if (lastUserMsgRef.current) { setInput(lastUserMsgRef.current); textareaRef.current?.focus(); } }}
                    style={{ fontSize: 10.5, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
                    Retry last
                  </button>
                ) : <span />}
                <span style={{ fontSize: 9.5, color: 'var(--text-faint)', letterSpacing: '0.05em', textAlign: 'right' }}>
                  {CYAN && INDIGO ? 'Shift+Enter for new line' : ''}
                  Shift+Enter for new line
                </span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
