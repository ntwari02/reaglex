import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Heart, MapPin, CreditCard, Star, RotateCcw, User, ChevronRight,
  Truck, CheckCircle, Clock, ShoppingBag, Shield, ArrowUpRight, Edit3, Plus,
  Settings, LogOut, LayoutGrid, List, ChevronDown, Eye, Headphones, X, Copy,
  Trash2, Check, Search, Upload, ArrowLeft,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import AccountSettingsDashboard from '../components/AccountSettingsDashboard';
import { useAuthStore } from '../stores/authStore';
import { useRecentlyViewed } from '../stores/recentlyViewedStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useToastStore } from '../stores/toastStore';
import api, { paymentAPI } from '../services/api';

import { SERVER_URL } from '../lib/config';
const PRIMARY = '#f97316';
const resolveImg = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  return src.startsWith('http') ? src : `${SERVER_URL}${src}`;
};

const MOCK_ORDERS = [
  { id: 'ORD-1001', date: 'Feb 28, 2026', status: 'delivered', items: 2, total: 58.0, seller: 'Premium Store' },
  { id: 'ORD-1002', date: 'Feb 25, 2026', status: 'shipped', items: 1, total: 29.0, seller: 'TechHub' },
  { id: 'ORD-1003', date: 'Feb 20, 2026', status: 'processing', items: 3, total: 124.5, seller: 'Fashion Co.' },
  { id: 'ORD-1004', date: 'Feb 15, 2026', status: 'delivered', items: 1, total: 15.99, seller: 'Book World' },
];

const STATUS = {
  delivered: { bg: '#dcfce7', color: '#16a34a', label: 'Delivered', icon: CheckCircle },
  shipped: { bg: '#dbeafe', color: '#2563eb', label: 'Shipped', icon: Truck },
  processing: { bg: '#fff7ed', color: '#ea580c', label: 'Processing', icon: Clock },
  pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending', icon: Clock },
  cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled', icon: RotateCcw },
};

const RETURN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
];

const RETURN_STATUS_META = {
  PENDING: { label: 'Pending Review', bg: '#fef3c7', color: '#d97706' },
  UNDER_REVIEW: { label: 'Under Review', bg: '#dbeafe', color: '#1d4ed8' },
  APPROVED: { label: 'Approved', bg: '#dcfce7', color: '#16a34a' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#dc2626' },
  COMPLETED: { label: 'Completed', bg: '#e5e7eb', color: '#4b5563' },
  REFUNDED: { label: 'Refunded', bg: '#dcfce7', color: '#16a34a' },
};

const MOCK_RETURNS = [
  {
    id: 'RET-0001',
    orderId: 'ORD-1002',
    date: 'Feb 25, 2026',
    status: 'PENDING',
    productName: 'Adidas Nova 3 Running Shoes',
    variant: 'Size 42 · Black',
    quantity: 1,
    price: 29.0,
    image: 'https://images.unsplash.com/photo-1528701800489-20be3c30c1d5?w=320&q=80',
    reason: 'Wrong size / does not fit',
    reasonTag: 'Wrong Size',
    condition: 'Opened',
    resolution: 'Full Refund',
    refundAmount: 29.0,
    timeline: [
      { key: 'submitted', label: 'Return Submitted', at: 'Feb 25, 2026 · 10:32' },
      { key: 'review', label: 'Under Review', at: 'Seller has 48 hours to respond' },
      { key: 'response', label: 'Seller Response', at: null },
      { key: 'decision', label: 'Return Approved / Rejected', at: null },
      { key: 'shipped_back', label: 'Item Shipped Back', at: null },
      { key: 'refunded', label: 'Refund Processed', at: null },
    ],
  },
];

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'reviews', label: 'My Reviews', icon: Star },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'settings', label: 'Account Settings', icon: Settings },
];

const DEFAULT_GREEN = '#10b981';
const ADDRESS_TYPES = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    circleBg: '#fff7ed', // soft orange tint
    circleColor: PRIMARY,
  },
  {
    id: 'work',
    label: 'Work',
    icon: '💼',
    circleBg: '#eff6ff', // soft blue tint
    circleColor: '#2563eb',
  },
  {
    id: 'other',
    label: 'Other',
    icon: '📍',
    circleBg: '#f3f4f6', // soft gray tint
    circleColor: '#6b7280',
  },
];

const INITIAL_ADDRESSES = [];

function CountUp({ value, duration = 0.8, delay = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = Number(value) || 0;
    let start = 0;
    const startTime = Date.now() + delay * 1000;
    const tick = () => {
      const t = Math.min((Date.now() - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplay(Math.round(start + (num - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), delay * 1000);
    return () => clearTimeout(id);
  }, [value, duration, delay]);
  return <span>{display}</span>;
}

function CurrencyCountUp({ value, duration = 0.8, delay = 0, prefix = '$' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = Number(value) || 0;
    const startTime = Date.now() + delay * 1000;
    const start = 0;
    const tick = () => {
      const t = Math.min((Date.now() - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplay(start + (num - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), delay * 1000);
    return () => clearTimeout(id);
  }, [value, duration, delay]);
  return <span>{prefix}{display.toFixed(2)}</span>;
}

function ReturnsPolicySection() {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[20px]"
      style={{ background: 'var(--card-bg)', boxShadow: '0 12px 32px rgba(15,23,42,0.45)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Return Policy
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Last updated: Jan 2026
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-5 pb-5 space-y-4 text-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['⏰ 30-Day Window', 'Return within 30 days of delivery'],
                ['💰 Full Refund', 'Original payment method within 3-5 days'],
                ['📦 Free Returns', 'We cover return shipping costs'],
                ['🛡️ Buyer Protection', 'Protected by Reaglex escrow'],
              ].map(([title, desc]) => (
                <div
                  key={title}
                  className="rounded-[14px] px-4 py-3"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(248,113,113,0.06)' }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#f97373' }}>
                These items cannot be returned:
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Digital goods, perishables, custom orders, and intimate items are final sale and
                cannot be returned.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
              {[
                ['Request', 'Submit a return request with photos and details.'],
                ['Ship Back', 'If approved, ship the item back using the provided label.'],
                ['Get Refund', 'Once received, your refund is processed in 3-5 days.'],
              ].map(([title, desc], idx) => (
                <div key={title} className="flex items-start gap-3 flex-1 min-w-[0]">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                    style={{
                      background: 'rgba(249,115,22,0.1)',
                      color: PRIMARY,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </p>
                    <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PaymentsTabContent() {
  const showToast = useToastStore((s) => s.showToast);
  const [now, setNow] = useState(Date.now());
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [addMethodType, setAddMethodType] = useState('card');
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [disputeForm, setDisputeForm] = useState({
    reason: '',
    otherReason: '',
    description: '',
    resolution: 'FULL_REFUND',
    partialAmount: '',
    willingToReturn: false,
    evidence: [],
  });

  const [activeEscrowOrders, setActiveEscrowOrders] = useState([
    {
      id: 'ORD-1002',
      productName: 'Adidas Nova 3',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&q=80',
      amount: 29.0,
      orderStatus: 'SHIPPED',
      escrowStatus: 'ESCROW_HOLD',
      releaseAt: Date.now() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000,
      disputeWindowEndsAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      timerPaused: false,
      dispute: null,
    },
  ]);

  const selectedOrder = activeEscrowOrders.find((o) => o.id === selectedOrderId) || null;
  const activeDisputeOrder = selectedOrder || activeEscrowOrders.find((o) => o.dispute) || null;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDisputeModalOpen(false);
        setAddMethodOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const diff = Math.max(0, (activeEscrowOrders[0]?.releaseAt || now) - now);
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((diff / (60 * 1000)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const under24h = diff <= 24 * 60 * 60 * 1000;
  const countdownLabel = diff > 0
    ? `Auto-releases in: ${days}d ${hours}h ${minutes}m ${seconds}s`
    : 'Eligible for release now';

  const disputeReasons = [
    'Item not delivered',
    'Wrong item received',
    'Item damaged',
    'Item not as described',
    'Missing parts',
    'Seller not responding',
    'Other',
  ];

  const isDisputeEligible = (order) =>
    ['SHIPPED', 'DELIVERED'].includes(order.orderStatus) &&
    order.escrowStatus === 'ESCROW_HOLD' &&
    now <= order.disputeWindowEndsAt;

  const openDispute = (order) => {
    if (!isDisputeEligible(order)) {
      showToast('Dispute can only be raised for shipped/delivered orders still in escrow within the dispute window.', 'error');
      return;
    }
    setSelectedOrderId(order.id);
    setDisputeForm({
      reason: '',
      otherReason: '',
      description: '',
      resolution: 'FULL_REFUND',
      partialAmount: '',
      willingToReturn: false,
      evidence: [],
    });
    setDisputeModalOpen(true);
  };

  const handleEvidenceChange = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const merged = [...disputeForm.evidence, ...list].slice(0, 5);
    const maxSize = 10 * 1024 * 1024;
    const invalid = merged.find((f) => f.size > maxSize);
    if (invalid) {
      showToast(`File too large: ${invalid.name}. Max 10MB per file.`, 'error');
      return;
    }
    setDisputeForm((prev) => ({ ...prev, evidence: merged }));
  };

  const submitDispute = async () => {
    if (!selectedOrder) return;
    const reason = disputeForm.reason === 'Other' ? disputeForm.otherReason.trim() : disputeForm.reason;
    if (!reason) {
      showToast('Please select a dispute reason.', 'error');
      return;
    }
    if ((disputeForm.description || '').trim().length < 30) {
      showToast('Please provide at least 30 characters in the dispute description.', 'error');
      return;
    }
    if (disputeForm.resolution === 'PARTIAL_REFUND') {
      const partial = Number(disputeForm.partialAmount);
      if (!partial || partial <= 0 || partial >= selectedOrder.amount) {
        showToast('Enter a valid partial refund amount less than the order amount.', 'error');
        return;
      }
    }
    const requiresImage = ['Item damaged', 'Wrong item received'].includes(disputeForm.reason);
    const hasImage = disputeForm.evidence.some((f) => f.type.startsWith('image/'));
    if (requiresImage && !hasImage) {
      showToast('Image evidence is required for damaged/wrong item disputes.', 'error');
      return;
    }
    if (disputeForm.evidence.length === 0) {
      showToast('Please upload at least one evidence file.', 'error');
      return;
    }

    setSubmittingDispute(true);
    const disputeId = `DSP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`;
    const disputeCount = Number(localStorage.getItem('reaglex_dispute_count') || '0') + 1;
    localStorage.setItem('reaglex_dispute_count', String(disputeCount));
    const riskScore = Math.min(95, 20 + disputeCount * 15 + (disputeForm.evidence.length >= 3 ? 10 : 0));
    const freezeSeller = disputeCount >= 3;
    const timeline = [
      { at: new Date().toISOString(), label: 'Buyer opened dispute', by: 'BUYER' },
      { at: new Date().toISOString(), label: 'Escrow auto-release paused', by: 'SYSTEM' },
      { at: new Date().toISOString(), label: 'Seller notified to respond', by: 'SYSTEM' },
      ...(freezeSeller ? [{ at: new Date().toISOString(), label: 'Seller payout temporarily frozen due to repeat disputes', by: 'FRAUD_ENGINE' }] : []),
    ];
    try {
      await paymentAPI.raiseDispute(selectedOrder.id, {
        reason,
        description: disputeForm.description,
        evidence: disputeForm.evidence.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
        requestedResolution: disputeForm.resolution,
        partialAmount: disputeForm.resolution === 'PARTIAL_REFUND' ? Number(disputeForm.partialAmount) : undefined,
        willingToReturn: disputeForm.willingToReturn,
      });
    } catch (err) {
      // Keep UX responsive with local state even if API fails in dev.
      // eslint-disable-next-line no-console
      console.warn('raiseDispute failed, applying local dispute state:', err);
    } finally {
      setSubmittingDispute(false);
    }

    setActiveEscrowOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              escrowStatus: 'DISPUTED',
              timerPaused: true,
              dispute: {
                id: disputeId,
                status: 'UNDER_REVIEW',
                reason,
                requestedResolution: disputeForm.resolution,
                timeline,
                chat: [
                  { id: 'c1', sender: 'SYSTEM', text: 'Dispute opened. Seller has 24h to respond.', at: new Date().toISOString() },
                ],
                disputeCount,
                riskScore,
                freezeSeller,
              },
            }
          : o
      )
    );
    setDisputeModalOpen(false);
    showToast('⚠️ Dispute raised. Our team will review within 24h', 'warning');
  };

  const sendChatMessage = () => {
    if (!selectedOrder || !selectedOrder.dispute) return;
    if (!chatInput.trim() && chatFiles.length === 0) return;
    const attachments = chatFiles.map((f) => ({ name: f.name, type: f.type }));
    setActiveEscrowOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              dispute: {
                ...o.dispute,
                chat: [
                  ...o.dispute.chat,
                  { id: `c-${Date.now()}`, sender: 'BUYER', text: chatInput.trim() || 'Attachment uploaded', attachments, at: new Date().toISOString() },
                ],
              },
            }
          : o
      )
    );
    setChatInput('');
    setChatFiles([]);
  };

  const applyAdminDecision = (decision) => {
    if (!activeDisputeOrder) return;
    setActiveEscrowOrders((prev) =>
      prev.map((o) =>
        o.id === activeDisputeOrder.id
          ? {
              ...o,
              escrowStatus: decision.includes('REFUND') ? 'REFUNDED' : decision === 'RELEASE_SELLER' ? 'RELEASED' : o.escrowStatus,
              timerPaused: decision === 'REQUEST_RETURN' ? true : o.timerPaused,
              dispute: {
                ...o.dispute,
                status: 'RESOLVED',
                timeline: [
                  ...o.dispute.timeline,
                  { at: new Date().toISOString(), label: `Admin decision: ${decision}`, by: 'ADMIN' },
                ],
              },
            }
          : o
      )
    );
    showToast(`Admin decision applied: ${decision}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Escrow wallet balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors duration-300"
      >
        <div className="px-6 sm:px-8 pt-6 pb-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Spent */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 border border-orange-100 shrink-0">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-medium">Total Spent</p>
                <p className="mt-1 text-[24px] font-bold leading-none text-[var(--text-primary)]">
                  <CurrencyCountUp value={227.49} />
                </p>
                <p className="text-[11px] mt-1 text-[var(--text-faint)]">All time on Reaglex</p>
                <p className="text-[11px] mt-1 font-semibold text-emerald-600">+ $29 this month</p>
              </div>
            </div>

            {/* In Escrow */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-100 shrink-0 escrow-pulse">
                <span className="text-lg">🔒</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-medium">In Escrow</p>
                <p className="mt-1 text-[24px] font-bold leading-none text-orange-500">
                  <CurrencyCountUp value={29.0} />
                </p>
                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Currently held for active orders</p>
                <p className="text-[11px] mt-1 font-semibold text-orange-500">1 order pending</p>
              </div>
            </div>

            {/* Released */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-100 shrink-0">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-medium">Released</p>
                <p className="mt-1 text-[24px] font-bold leading-none text-emerald-600">
                  <CurrencyCountUp value={198.49} />
                </p>
                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Successfully paid out to sellers</p>
                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Last: Feb 28</p>
              </div>
            </div>

            {/* Refunded */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 border border-purple-100 shrink-0">
                <span className="text-lg">🔄</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-medium">Refunded</p>
                <p className="mt-1 text-[24px] font-bold leading-none text-[var(--text-primary)]">
                  <CurrencyCountUp value={0} />
                </p>
                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Total refunded back to you</p>
                <p className="text-[11px] mt-1 text-[var(--text-faint)]">No refunds</p>
              </div>
            </div>
          </div>

          {/* Footer row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50">
              🛡️ Escrow Protection: ACTIVE
            </span>
            <span className="text-[var(--text-faint)]">Platform fee: 5% per transaction</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
            >
              View Full Transaction History
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Active escrow orders (single example) */}
      <Card className="border border-\[var\(--divider\)\]">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-2 border-b border-\[var\(--divider\)\]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h2 className="font-bold text-base text-[var(--text-primary)]">Active Escrow Holdings</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
            {activeEscrowOrders.length} order
          </span>
        </div>
        <div className="p-5 space-y-4">
          {activeEscrowOrders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-orange-100 dark:border-orange-900/40 bg-white/80 dark:bg-gray-900 p-4 flex flex-col gap-3 escrow-row-pulse transition-colors duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-\[var\(--bg-tertiary\)\]">
                  <img src={o.image} alt={o.productName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Order {o.id}</p>
                  <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{o.productName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: PRIMARY }}>${o.amount.toFixed(2)}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 ${
                      o.escrowStatus === 'DISPUTED'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {o.escrowStatus === 'DISPUTED' ? '⚠️ Disputed' : '🔒 Funds Held'}
                  </span>
                </div>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-between text-[11px] font-medium mb-1 text-[var(--text-muted)]">
                  {['Paid', 'Held', 'Shipped', 'Confirm', 'Released'].map((label, idx) => {
                    const statusIndex = 1;
                    const done = idx <= statusIndex;
                    const current = idx === statusIndex;
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${current ? 'escrow-step-pulse' : ''} ${done ? 'text-white' : 'bg-gray-200 dark:bg-gray-600 text-[var(--text-muted)]'}`}
                          style={done ? { background: PRIMARY } : {}}
                        >
                          {done ? '✓' : ''}
                        </div>
                        <span className="mt-1">{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mt-1">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '25%', background: `linear-gradient(90deg, ${PRIMARY}, #facc15)` }}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
                <p
                  className={`text-xs font-medium ${under24h ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}
                >
                  {o.timerPaused ? '⏸ Auto-release paused (dispute opened)' : countdownLabel}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl font-semibold text-white"
                    style={{ background: PRIMARY }}
                  >
                    ✅ Confirm Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => openDispute(o)}
                    disabled={!isDisputeEligible(o)}
                    className={`px-3 py-1.5 rounded-xl font-semibold border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400 ${!isDisputeEligible(o) ? 'opacity-55 cursor-not-allowed' : ''}`}
                  >
                    ⚠️ Raise Dispute
                  </button>
                  <Link
                    to={`/track/${o.id}`}
                    className="px-2 py-1.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300"
                  >
                    📦 Track Order
                  </Link>
                </div>
              </div>
              {!isDisputeEligible(o) && o.escrowStatus !== 'DISPUTED' && (
                <p className="text-[11px] text-[var(--text-faint)]">
                  Disputes are only allowed for shipped/delivered orders still in escrow and within dispute window.
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {activeDisputeOrder?.dispute && (
                        <Card className="border border-\[var\(--divider\)\]">
          <div className="px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-\[var\(--divider\)\]">
            <div>
              <p className="font-bold text-base text-[var(--text-primary)]">Dispute Status</p>
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                ID: {activeDisputeOrder.dispute.id} · Status: {activeDisputeOrder.dispute.status.replaceAll('_', ' ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setActiveEscrowOrders((prev) =>
                  prev.map((o) =>
                    o.id === activeDisputeOrder.id
                      ? {
                          ...o,
                          dispute: {
                            ...o.dispute,
                            status: 'ESCALATED_TO_ADMIN',
                            timeline: [
                              ...o.dispute.timeline,
                              { at: new Date().toISOString(), label: 'Buyer escalated dispute to admin', by: 'BUYER' },
                            ],
                          },
                        }
                      : o
                  )
                )
              }
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 bg-\[var\(--card-bg\)\]"
            >
              Escalate to Admin
            </button>
          </div>
          <div className="px-6 pt-3 flex flex-wrap gap-2 text-[11px]">
            {['UNDER_REVIEW', 'SELLER_RESPONDED', 'AWAITING_BUYER_RESPONSE', 'ESCALATED_TO_ADMIN', 'RESOLVED'].map((s) => (
              <span
                key={s}
                className={`px-2.5 py-1 rounded-full font-semibold ${activeDisputeOrder.dispute.status === s ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-\[var\(--bg-tertiary\)\] text-[var(--text-muted)]'}`}
              >
                {s.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
            <div>
              <p className="font-semibold text-sm mb-2 text-[var(--text-primary)]">Timeline Activity</p>
              <div className="space-y-2">
                {activeDisputeOrder.dispute.timeline.map((item, idx) => (
                  <div key={`${item.at}-${idx}`} className="p-2.5 rounded-lg border border-\[var\(--divider-strong\)\]">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</p>
                    <p className="text-[11px] text-[var(--text-faint)]">
                      {new Date(item.at).toLocaleString('en-US', { timeZone: 'Africa/Kigali' })} · {item.by}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-\[var\(--bg-secondary\)\]/50">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Fraud Protection Snapshot</p>
                <p className="text-[11px] mt-1 text-[var(--text-muted)]">
                  Dispute frequency tracked · Repeat offender detection active · Risk score: {activeDisputeOrder.dispute.riskScore}/100
                </p>
                <p className={`text-[11px] mt-1 ${activeDisputeOrder.dispute.freezeSeller ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
                  {activeDisputeOrder.dispute.freezeSeller
                    ? 'Seller temporarily frozen for risk review (repeat disputes detected).'
                    : 'Seller account remains active.'}
                </p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-2 text-[var(--text-primary)]">Dispute Chat (Buyer · Seller · Admin)</p>
              <div className="border border-\[var\(--divider-strong\)\] rounded-xl p-3 h-52 overflow-y-auto space-y-2 bg-[var(--bg-secondary)]">
                {activeDisputeOrder.dispute.chat.map((m) => (
                  <div key={m.id} className="text-xs">
                    <p className="text-[var(--text-secondary)]">
                      <strong>{m.sender}:</strong> {m.text}
                    </p>
                    {m.attachments?.length ? (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Attachments: {m.attachments.map((a) => a.name).join(', ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-\[var\(--card-bg\)\] text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs"
                />
                <button type="button" onClick={sendChatMessage} className="px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: PRIMARY }}>
                  Send
                </button>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setChatFiles(Array.from(e.target.files || []))}
                className="mt-2 text-[11px]"
              />
              <div className="mt-3 border border-\[var\(--divider-strong\)\] rounded-xl p-3">
                <p className="text-xs font-semibold mb-2 text-[var(--text-secondary)]">Admin Decision Options</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button type="button" onClick={() => applyAdminDecision('FULL_REFUND')} className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Refund buyer (full)</button>
                  <button type="button" onClick={() => applyAdminDecision('PARTIAL_REFUND')} className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Refund buyer (partial)</button>
                  <button type="button" onClick={() => applyAdminDecision('RELEASE_SELLER')} className="px-2 py-1.5 rounded-lg border border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">Release funds to seller</button>
                  <button type="button" onClick={() => applyAdminDecision('REQUEST_RETURN')} className="px-2 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-900/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">Request return first</button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Saved methods + history + info could be added here similarly */}

      <AnimatePresence>
        {disputeModalOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.6)' }}
            onClick={() => setDisputeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-5 transition-colors duration-300"
              style={{ background: 'var(--card-bg)', boxShadow: '0 24px 72px rgba(0,0,0,0.8)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold text-base text-[var(--text-primary)]">Raise Dispute</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Order {selectedOrder.id} · Escrow will freeze and auto-release will pause after submission.
                  </p>
                </div>
                <button type="button" onClick={() => setDisputeModalOpen(false)}>
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Reason (required)
                  </label>
                  <select
                    value={disputeForm.reason}
                    onChange={(e) => setDisputeForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--divider-strong)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Select a reason</option>
                    {disputeReasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {disputeForm.reason === 'Other' && (
                    <input
                      value={disputeForm.otherReason}
                      onChange={(e) => setDisputeForm((prev) => ({ ...prev, otherReason: e.target.value }))}
                      placeholder="Please specify"
                      className="mt-2 w-full px-3 py-2 rounded-lg border text-xs outline-none placeholder-gray-400"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--divider-strong)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Detailed Description (min 30 chars)
                  </label>
                  <textarea
                    value={disputeForm.description}
                    onChange={(e) => setDisputeForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    placeholder="Describe the issue in detail..."
                    className="w-full px-3 py-2 rounded-lg border resize-none text-xs outline-none placeholder-gray-400"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--divider-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <p
                    className="mt-1 text-[11px]"
                    style={{
                      color:
                        disputeForm.description.length >= 30 ? '#16a34a' : 'var(--text-faint)',
                    }}
                  >
                    {disputeForm.description.length}/30 minimum
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Evidence Upload (max 5 files, 10MB each)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => handleEvidenceChange(e.target.files)}
                    className="w-full text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  {disputeForm.evidence.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {disputeForm.evidence.map((f, idx) => (
                        <div
                          key={`${f.name}-${idx}`}
                          className="flex items-center justify-between p-2 rounded border text-[11px] transition-colors"
                          style={{
                            background: 'var(--bg-secondary)',
                            borderColor: 'var(--divider-strong)',
                          }}
                        >
                          <span style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setDisputeForm((prev) => ({
                                ...prev,
                                evidence: prev.evidence.filter((_, i) => i !== idx),
                              }))
                            }
                            className="hover:underline"
                            style={{ color: '#ef4444' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Requested Resolution
                    </label>
                    <select
                      value={disputeForm.resolution}
                      onChange={(e) => setDisputeForm((prev) => ({ ...prev, resolution: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--divider-strong)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="FULL_REFUND">Full refund</option>
                      <option value="PARTIAL_REFUND">Partial refund</option>
                      <option value="REPLACEMENT">Replacement item</option>
                      <option value="RETURN_AND_REFUND">Return & refund</option>
                    </select>
                  </div>
                  {disputeForm.resolution === 'PARTIAL_REFUND' && (
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Partial Amount
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={disputeForm.partialAmount}
                        onChange={(e) => setDisputeForm((prev) => ({ ...prev, partialAmount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border text-xs outline-none placeholder-gray-400"
                        style={{
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--divider-strong)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  )}
                </div>

                <label className="inline-flex items-start gap-2 text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={disputeForm.willingToReturn}
                    onChange={(e) => setDisputeForm((prev) => ({ ...prev, willingToReturn: e.target.checked }))}
                    className="mt-0.5"
                    style={{ accentColor: PRIMARY }}
                  />
                  <span>
                    I am willing to return the item.
                    <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Return policy: approved return disputes require item handoff within 5 business days.
                    </span>
                  </span>
                </label>

                <div
                  className="p-3 rounded-lg text-[11px]"
                  style={{
                    background: 'rgba(245,158,11,0.08)',
                    color: '#92400e',
                  }}
                >
                  ⏳ Auto-release in: {days}d {hours}h {minutes}m. This timer will pause after dispute submission.
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                  style={{
                    background: 'transparent',
                    boxShadow: '0 0 0 1px var(--divider-strong)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDispute}
                  disabled={submittingDispute}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
                  style={{
                    background: '#ef4444',
                    boxShadow: '0 10px 28px rgba(239,68,68,0.45)',
                  }}
                >
                  {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Payment Method Modal (simplified) */}
      <AnimatePresence>
        {addMethodOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.45)' }}
            onClick={() => setAddMethodOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-\[var\(--card-bg\)\] p-5 transition-colors duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-base text-[var(--text-primary)]">Add Payment Method</p>
                  <p className="text-xs mt-0.5 text-[var(--text-muted)]">Connect a card, mobile money wallet, PayPal or bank account.</p>
                </div>
                <button type="button" onClick={() => setAddMethodOpen(false)}>
                  <X className="w-4 h-4 text-[var(--text-faint)]" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                {[
                  { id: 'card', label: 'Card', icon: '💳' },
                  { id: 'mobile', label: 'Mobile Money', icon: '📱' },
                  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                  { id: 'bank', label: 'Bank', icon: '🏦' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAddMethodType(t.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      addMethodType === t.id
                        ? 'text-white border-transparent'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    style={addMethodType === t.id ? { background: PRIMARY } : {}}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Simple body for card type only (others omitted for brevity) */}
              {addMethodType === 'card' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block mb-1 font-medium text-[var(--text-secondary)]">Card Number</label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• ••••"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-[var(--text-secondary)]">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="As shown on card"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                    />
                  </div>
                </div>
              )}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border" style={{ accentColor: PRIMARY }} />
                  <span className="font-medium text-[var(--text-secondary)]">Set as default</span>
                </label>
                <p className="text-[11px] text-[var(--text-muted)]">🔒 Encrypted & secure. We never store full card numbers.</p>
              </div>
              <div className="mt-4 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setAddMethodOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-semibold border border-gray-200 dark:border-gray-600 text-[var(--text-secondary)] bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white"
                  style={{ background: PRIMARY }}
                >
                  Add Method →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Futuristic grid + orb pattern for banner ────────────────────────────────
function PatternOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Fine grid */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.07 }}>
        <defs>
          <pattern id="db-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#db-grid)" />
      </svg>
      {/* Glow orb left */}
      <div style={{
        position: 'absolute', top: '-40%', left: '-8%',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 70%)',
        filter: 'blur(32px)',
      }} />
      {/* Glow orb right */}
      <div style={{
        position: 'absolute', bottom: '-60%', right: '-4%',
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
        filter: 'blur(28px)',
      }} />
      {/* Scan line */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.015) 50%, transparent 100%)',
      }} />
    </div>
  );
}

// ── Reusable card wrapper ───────────────────────────────────────────────────
function Card({ children, className = '', style = {}, glow = false }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: glow
          ? '0 0 0 1px rgba(249,115,22,0.12), 0 8px 32px rgba(0,0,0,0.12), 0 0 24px rgba(249,115,22,0.05)'
          : 'var(--card-shadow)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, action }) {
  return (
    <div
      className="flex items-center justify-between px-6 pt-5 pb-4 border-b"
      style={{ borderColor: 'var(--divider)' }}
    >
      <h3
        className="font-semibold text-sm tracking-wide"
        style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
      >
        {title}
      </h3>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(249,115,22,0.12)',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'radial-gradient(circle at 50% 50%, rgba(249,115,22,0.07), transparent 70%)',
        }} />
        <Icon className="w-9 h-9 relative z-10" style={{ color: 'rgba(249,115,22,0.5)' }} />
      </div>
      <p className="font-bold text-lg" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {sub && (
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-faint)' }}>{sub}</p>
      )}
      {cta}
    </div>
  );
}

export default function BuyerDashboard() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const rawTab = sp.get('tab') || 'overview';
  // Support legacy /account?tab=payment by mapping it to the payments tab
  const tab = rawTab === 'payment' ? 'payments' : rawTab;
  const setTab = (t) => setSp((prev) => { const n = new URLSearchParams(prev); n.set('tab', t); return n; });

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const recentItems = useRecentlyViewed((s) => s.items);
  const clearRecent = useRecentlyViewed((s) => s.clear);
  const wishlistItems = useWishlistStore((s) => s.items);
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist);
  const addItem = useBuyerCart((s) => s.addItem);

  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatus, setOrdersStatus] = useState('all');
  const [ordersDateRange, setOrdersDateRange] = useState('30');
  const [ordersSort, setOrdersSort] = useState('newest');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [wishlistSearch, setWishlistSearch] = useState('');
  const [wishlistSortOpen, setWishlistSortOpen] = useState(false);
  const [reviewsFilter, setReviewsFilter] = useState('all');
  const [reviewsSort, setReviewsSort] = useState('newest');
  const recentScrollRef = useRef(null);
  const showToast = useToastStore((s) => s.showToast);

  // Returns & refunds state (UI-only for now)
  const [returnsFilter, setReturnsFilter] = useState('all');
  const [returnsSearch, setReturnsSearch] = useState('');
  const [returns] = useState(MOCK_RETURNS);
  const [activeReturn, setActiveReturn] = useState(null);
  const [returnDetailsOpen, setReturnDetailsOpen] = useState(false);
  const [newReturnOpen, setNewReturnOpen] = useState(false);
  const [newReturnStep, setNewReturnStep] = useState(1);
  const [newReturnOrderSearch, setNewReturnOrderSearch] = useState('');
  const [newReturnSelectedOrderId, setNewReturnSelectedOrderId] = useState(null);
  const [newReturnReason, setNewReturnReason] = useState('');
  const [newReturnCondition, setNewReturnCondition] = useState('opened');
  const [newReturnDescription, setNewReturnDescription] = useState('');
  const [newReturnPhotos, setNewReturnPhotos] = useState([]);
  const [newReturnResolution, setNewReturnResolution] = useState('refund');

  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressEditId, setAddressEditId] = useState(null);
  const [addressForm, setAddressForm] = useState(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [copiedAddressId, setCopiedAddressId] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState(null);
  const mobileTabsRef = useRef(null);
  const [showMobileLeftFade, setShowMobileLeftFade] = useState(false);
  const [showMobileRightFade, setShowMobileRightFade] = useState(false);
  const [mobileNavHintDismissed, setMobileNavHintDismissed] = useState(false);

  const mapApiOrderToUi = (order) => {
    if (!order) return null;
    const createdAt = order.created_at || order.date || order.createdAt;
    const date = createdAt
      ? new Date(createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';
    const itemsCount = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 0;

    return {
      id: order.order_number || order.orderNumber || order.id,
      date,
      status: order.status || 'processing',
      items: itemsCount,
      total: order.total || 0,
      seller: order.seller?.name || 'Unknown Seller',
    };
  };

  const uiOrders = Array.isArray(orders) ? orders : [];

  const mapApiAddressToUi = (addr, index, user) => {
    if (!addr) return null;
    const street = addr.street || '';
    // Try to split street into line1 / line2 on first comma
    const [line1, ...rest] = street.split(',');
    const line2 = rest.join(',').trim();
    const type =
      (addr.label || '').toLowerCase() === 'home' ? 'home'
        : (addr.label || '').toLowerCase() === 'work' ? 'work'
        : 'other';
    return {
      id: `addr-${index}`,
      index,
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      line1: line1.trim(),
      line2,
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zipCode || '',
      country: addr.country || '',
      type,
      default: !!addr.isDefault,
    };
  };

  useEffect(() => {
    if (user?.id) useWishlistStore.getState().fetchWishlist(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchAddresses = async () => {
      try {
        setAddressesLoading(true);
        setAddressesError(null);
        const res = await api.get('/profile/me');
        const profileUser = res.data?.user;
        const apiAddresses = profileUser?.addresses || [];
        const mapped = apiAddresses
          .map((addr, index) => mapApiAddressToUi(addr, index, profileUser))
          .filter(Boolean);
        setAddresses(mapped);
      } catch (err) {
        console.error('Failed to load addresses', err);
        setAddressesError('Failed to load addresses');
      } finally {
        setAddressesLoading(false);
      }
    };
    fetchAddresses();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        setOrdersError(null);
        const res = await api.get('/orders', { params: { limit: 50 } });
        const rawOrders = res.data?.orders || res.data?.data?.orders || [];
        const mapped = rawOrders
          .map(mapApiOrderToUi)
          .filter(Boolean);
        setOrders(mapped);
      } catch (err) {
        console.error('Failed to load buyer orders', err);
        setOrdersError('Failed to load orders');
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user?.id]);

  useEffect(() => {
    const close = (e) => { if (deleteConfirmId && !e.target.closest('[data-delete-popover]')) setDeleteConfirmId(null); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [deleteConfirmId]);

  useEffect(() => {
    const el = mobileTabsRef.current;
    if (!el) return;
    const update = () => {
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      setShowMobileLeftFade(el.scrollLeft > 4);
      setShowMobileRightFade(el.scrollLeft < maxLeft - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [tab]);

  useEffect(() => {
    const el = mobileTabsRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('[data-mobile-tab-active="true"]');
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [tab]);

  if (!user) {
    return (
      <BuyerLayout>
        <div
          className="flex flex-col items-center justify-center min-h-[70vh] gap-6 relative overflow-hidden"
          style={{ background: 'var(--bg-page)' }}
        >
          {/* Background grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(249,115,22,0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          <div style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }} />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(139,92,246,0.08))',
              border: '1px solid rgba(249,115,22,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(249,115,22,0.12)',
            }}>
              <User style={{ width: 32, height: 32, color: 'rgba(249,115,22,0.7)' }} />
            </div>
            <div className="text-center">
              <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 8 }}>
                Sign in to view your account
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Manage orders, wishlist, addresses and more</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/auth?tab=login')}
              style={{
                padding: '11px 32px', borderRadius: 12,
                background: `linear-gradient(135deg, ${PRIMARY}, #c2410c)`,
                color: 'white', fontWeight: 700, fontSize: 14,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(249,115,22,0.4)',
                letterSpacing: '0.04em',
              }}
            >
              Sign In →
            </motion.button>
          </div>
        </div>
      </BuyerLayout>
    );
  }

  const initials = (user.full_name || user.email || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const displayName = user.full_name || 'User';
  const rawAvatar = (user?.avatar_url || user?.avatarUrl || '').trim();
  const avatarSrc = rawAvatar
    ? (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:') ? rawAvatar : `${SERVER_URL}${rawAvatar.startsWith('/') ? rawAvatar : `/${rawAvatar}`}`)
    : '';
  const hasAvatar = !!avatarSrc;
  const tabLabel = TAB_CONFIG.find((t) => t.id === tab)?.label || 'Overview';
  const isAddressesTab = tab === 'addresses';
  const isPaymentsTab = tab === 'payments';

  const orderCount = uiOrders.length;
  const reviewCount = 8;
  const savedCount = wishlistItems.length;

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      !returnsSearch ||
      r.orderId.toLowerCase().includes(returnsSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(returnsSearch.toLowerCase());
    const matchesFilter =
      returnsFilter === 'all' ||
      (returnsFilter === 'pending' && (r.status === 'PENDING' || r.status === 'UNDER_REVIEW')) ||
      (returnsFilter === 'approved' && (r.status === 'APPROVED' || r.status === 'REFUNDED')) ||
      (returnsFilter === 'rejected' && r.status === 'REJECTED') ||
      (returnsFilter === 'completed' && r.status === 'COMPLETED');
    return matchesSearch && matchesFilter;
  });

  return (
    <BuyerLayout>
      <div
        className="min-h-screen"
        style={{ fontFamily: 'Inter, system-ui, sans-serif', background: 'var(--bg-page)', color: 'var(--text-primary)', position: 'relative' }}
      >
        {/* Subtle full-page dot grid */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(249,115,22,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.5,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ═══ TIER 1: Page header banner ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative w-full flex items-center justify-between px-6 sm:px-8 lg:px-[32px] py-7"
          style={{
            minHeight: 156,
            background: 'var(--card-bg)',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          {/* Accent line at top */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: PRIMARY,
            opacity: 0.75,
          }} />
          <div className="relative z-10 flex items-center justify-between w-full gap-4">
            {!isPaymentsTab && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: PRIMARY, padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)',
                    }}>
                      {isAddressesTab ? 'Addresses' : 'Dashboard'}
                    </span>
                  </div>
                  <h1 className="font-black" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
                    {isAddressesTab ? 'My Addresses' : 'My Account'}
                  </h1>
                  {isAddressesTab && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your delivery addresses</p>
                  )}
                  <p className="text-xs mt-2 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-faint)' }}>
                    <Link to="/" className="hover:opacity-90 transition-opacity" style={{ color: 'var(--text-secondary)' }}>Home</Link>
                    <span style={{ color: 'rgba(249,115,22,0.5)' }}>›</span>
                    <Link to="/account" className="hover:opacity-90 transition-opacity" style={{ color: 'var(--text-secondary)' }}>Account</Link>
                    <span style={{ color: 'rgba(249,115,22,0.5)' }}>›</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{tabLabel}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    <span style={{
                      display: 'inline-block', marginTop: 5, fontSize: 10, fontWeight: 600,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: '#4ade80', padding: '1px 7px', borderRadius: 4,
                      background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                    }}>● Active</span>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.06 }}
                    className="w-14 h-14 sm:w-[62px] sm:h-[62px] rounded-full flex items-center justify-center text-white font-black flex-shrink-0 relative overflow-hidden"
                    style={{
                      background: hasAvatar ? 'var(--bg-tertiary)' : PRIMARY,
                      fontSize: 22,
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: -3, borderRadius: '50%',
                      background: 'transparent',
                      border: '1.5px solid rgba(249,115,22,0.45)',
                    }} />
                    {hasAvatar ? (
                      <img
                        key={`${avatarSrc}-${user?.updated_at || ''}`}
                        src={avatarSrc}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </motion.div>
                </div>
              </>
            )}
            {isPaymentsTab && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: '#60a5fa', padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.22)',
                    }}>Payments</span>
                  </div>
                  <h1 className="font-black flex items-center gap-3" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
                    <span style={{ fontSize: 28 }}>💳</span> Payment Methods
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage payments, escrow & payouts</p>
                  <p className="text-xs mt-2 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-faint)' }}>
                    <Link to="/" className="hover:opacity-90 transition-opacity" style={{ color: 'var(--text-secondary)' }}>Home</Link>
                    <span style={{ color: 'rgba(249,115,22,0.5)' }}>›</span>
                    <Link to="/account" className="hover:opacity-90 transition-opacity" style={{ color: 'var(--text-secondary)' }}>Account</Link>
                    <span style={{ color: 'rgba(249,115,22,0.5)' }}>›</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Payment Methods</span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-semibold">
                  {[
                    { icon: '🔒', label: '256-bit SSL', color: '#86efac' },
                    { icon: '✅', label: 'PCI Compliant', color: '#93c5fd' },
                    { icon: '🛡️', label: 'Escrow Protected', color: PRIMARY },
                  ].map((b) => (
                    <div
                      key={b.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--card-border)',
                        backdropFilter: 'blur(8px)',
                        color: b.color,
                      }}
                    >
                      <span>{b.icon}</span>
                      <span className="whitespace-nowrap">{b.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ═══ TIER 2: Main layout — sidebar + content ═══ */}
        <div className="w-full" style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 22, paddingBottom: 40 }}>
          {/* Mobile: horizontal tab bar */}
          <div className="mb-5 lg:hidden">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                }}
              >
                Account Navigation
              </p>
              {!mobileNavHintDismissed && showMobileRightFade && (
                <button
                  type="button"
                  onClick={() => setMobileNavHintDismissed(true)}
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: PRIMARY,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  Swipe for more <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative">
              {showMobileLeftFade && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 12,
                    width: 24,
                    pointerEvents: 'none',
                    zIndex: 2,
                    background: 'linear-gradient(90deg, var(--bg-page), transparent)',
                  }}
                />
              )}
              {showMobileRightFade && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 12,
                    width: 24,
                    pointerEvents: 'none',
                    zIndex: 2,
                    background: 'linear-gradient(270deg, var(--bg-page), transparent)',
                  }}
                />
              )}

              <div
                ref={mobileTabsRef}
                className="flex items-center gap-2 overflow-x-auto pb-3"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {TAB_CONFIG.map((t) => {
                  const isActive = tab === t.id;
                  const Icon = t.icon;
                  return (
                    <motion.button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      data-mobile-tab-active={isActive ? 'true' : 'false'}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 relative"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${PRIMARY}, #c2410c)`
                          : 'var(--card-bg)',
                        color: isActive ? 'white' : 'var(--text-secondary)',
                        border: isActive ? 'none' : '1px solid var(--card-border)',
                        boxShadow: isActive ? `0 4px 16px rgba(249,115,22,0.35)` : 'none',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </motion.button>
                  );
                })}
                <motion.button
                  type="button"
                  onClick={handleLogout}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.18)',
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row" style={{ gap: 22 }}>
            {/* ═══ TIER 3: Sidebar (desktop) ═══ */}
            <aside
              className="hidden lg:block lg:flex-shrink-0 lg:sticky self-start"
              style={{ top: 24, width: 272 }}
            >
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 8px 32px rgba(0,0,0,0.14)',
              }}>
                {/* Top profile section */}
                <div style={{
                  padding: '24px 22px 20px',
                  background: 'linear-gradient(160deg, #0c0c1a 0%, #12122a 50%, #1c0f0f 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Grid bg */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }} />
                  {/* Orb */}
                  <div style={{
                    position: 'absolute', top: -30, right: -20,
                    width: 120, height: 120, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                  }} />
                  <div className="relative z-10 flex flex-col items-center text-center gap-3">
                    <div className="relative">
                      <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${PRIMARY}, #c2410c)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 900, fontSize: 24,
                        boxShadow: `0 0 0 3px rgba(249,115,22,0.2), 0 0 20px rgba(249,115,22,0.3)`,
                      }}>
                        {initials}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 12, height: 12, borderRadius: '50%',
                        background: '#22c55e', border: '2px solid #0c0c1a',
                      }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: 'white', fontSize: 15, letterSpacing: '-0.01em' }}>{displayName}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{user.email}</p>
                      <Link
                        to="/account?tab=settings"
                        style={{
                          display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 600,
                          color: PRIMARY, padding: '3px 10px', borderRadius: 6,
                          background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.22)',
                          letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
                        }}
                      >
                        Edit Profile
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  borderBottom: '1px solid var(--divider)',
                  background: 'var(--card-bg)',
                }}>
                  {[
                    { value: orderCount, label: 'Orders', color: PRIMARY },
                    { value: reviewCount, label: 'Reviews', color: '#a855f7' },
                    { value: savedCount, label: 'Saved', color: '#ec4899' },
                  ].map(({ value, label, color }, i) => (
                    <motion.div
                      key={label}
                      className="text-center cursor-default relative"
                      style={{ padding: '14px 6px', borderRight: i < 2 ? '1px solid var(--divider)' : 'none' }}
                      whileHover={{ scale: 1.04 }}
                    >
                      <p style={{ fontWeight: 800, fontSize: 22, lineHeight: 1, color }}><CountUp value={value} delay={0.2 + i * 0.1} /></p>
                      <p style={{ fontSize: 10, marginTop: 4, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Navigation */}
                <nav style={{ paddingTop: 6, paddingBottom: 6 }}>
                  {TAB_CONFIG.map((t) => {
                    const isActive = tab === t.id;
                    const Icon = t.icon;
                    const badge =
                      t.id === 'orders' ? orderCount : t.id === 'wishlist' ? savedCount : t.id === 'reviews' ? reviewCount : null;
                    return (
                      <Link
                        key={t.id}
                        to={`/account?tab=${t.id}`}
                        className="flex items-center gap-3 text-sm relative overflow-hidden"
                        style={{
                          padding: '11px 18px',
                          borderLeft: isActive ? `3px solid ${PRIMARY}` : '3px solid transparent',
                          background: isActive ? 'rgba(249,115,22,0.07)' : 'transparent',
                          color: isActive ? PRIMARY : 'var(--text-secondary)',
                          fontWeight: isActive ? 700 : 400,
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(249,115,22,0.05)';
                            e.currentTarget.style.color = PRIMARY;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        {isActive && (
                          <div style={{
                            position: 'absolute', left: 3, top: '50%', transform: 'translateY(-50%)',
                            width: 4, height: '60%', borderRadius: 2,
                            background: `linear-gradient(180deg, ${PRIMARY}, #c2410c)`,
                            boxShadow: `0 0 10px rgba(249,115,22,0.6)`,
                          }} />
                        )}
                        <Icon
                          className="flex-shrink-0"
                          style={{
                            width: 18, height: 18,
                            color: isActive ? PRIMARY : 'var(--text-muted)',
                          }}
                        />
                        <span className="flex-1 text-[13px]">{t.label}</span>
                        {badge != null && badge > 0 && (
                          <span style={{
                            minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10,
                            fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isActive ? PRIMARY : 'rgba(249,115,22,0.15)',
                            color: isActive ? 'white' : PRIMARY,
                          }}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  <div style={{ margin: '6px 18px', height: 1, background: 'var(--divider)' }} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-[13px] font-medium"
                    style={{
                      padding: '11px 18px',
                      color: '#f87171',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderLeft: '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderLeftColor = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}
                  >
                    <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />
                    Logout
                  </button>
                </nav>

                {/* Need Help card */}
                <div style={{
                  margin: '4px 14px 14px',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.07), rgba(139,92,246,0.05))',
                  border: '1px solid rgba(249,115,22,0.15)',
                }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${PRIMARY}, #c2410c)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                    }}>
                      <Headphones style={{ width: 16, height: 16, color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>Need Help?</p>
                      <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>24/7 support available</p>
                    </div>
                  </div>
                  <Link
                    to="/help"
                    style={{
                      display: 'block', width: '100%', padding: '9px',
                      borderRadius: 10, textAlign: 'center', fontSize: 12, fontWeight: 700,
                      color: 'white', textDecoration: 'none',
                      background: `linear-gradient(135deg, ${PRIMARY}, #c2410c)`,
                      boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Chat with us →
                  </Link>
                </div>
              </div>
            </aside>

            {/* ═══ Main content area ═══ */}
            <main className="flex-1 min-w-0 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* ── OVERVIEW ── */}
                  {tab === 'overview' && (
                    <div className="space-y-5">
                      {/* Stat cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { icon: Package, label: 'Total Orders', value: uiOrders.length, color: PRIMARY, glowColor: 'rgba(249,115,22,0.25)', grad: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.03))' },
                          { icon: Truck, label: 'In Transit', value: 1, color: '#60a5fa', glowColor: 'rgba(96,165,250,0.2)', grad: 'linear-gradient(135deg, rgba(96,165,250,0.1), rgba(96,165,250,0.03))' },
                          { icon: Star, label: 'Reviews Left', value: 8, color: '#fbbf24', glowColor: 'rgba(251,191,36,0.2)', grad: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.03))' },
                          { icon: ShoppingBag, label: 'Total Spent', value: '$227.49', color: '#4ade80', glowColor: 'rgba(74,222,128,0.2)', grad: 'linear-gradient(135deg, rgba(74,222,128,0.1), rgba(74,222,128,0.03))' },
                        ].map(({ icon: Icon, label, value, color, glowColor, grad }, idx) => (
                          <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.07 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            style={{
                              background: 'var(--card-bg)',
                              border: '1px solid var(--card-border)',
                              borderRadius: 18,
                              padding: '20px 18px',
                              textAlign: 'center',
                              position: 'relative',
                              overflow: 'hidden',
                              boxShadow: `0 0 0 1px ${glowColor} inset, 0 4px 20px rgba(0,0,0,0.06)`,
                              cursor: 'default',
                            }}
                          >
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: grad,
                            }} />
                            <div style={{
                              position: 'relative', zIndex: 1,
                              width: 42, height: 42, borderRadius: 12, margin: '0 auto 14px',
                              background: `${glowColor}`,
                              border: `1px solid ${color}22`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: `0 0 16px ${glowColor}`,
                            }}>
                              <Icon style={{ width: 20, height: 20, color }} />
                            </div>
                            <p style={{ position: 'relative', zIndex: 1, fontWeight: 800, fontSize: 26, lineHeight: 1, color, marginBottom: 6 }}>{value}</p>
                            <p style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Recent Orders */}
                      <Card>
                        <CardHeader
                          title="Recent Orders"
                          action={
                            <button
                              onClick={() => setTab('orders')}
                              className="flex items-center gap-1.5 text-xs font-semibold"
                              style={{ color: PRIMARY }}
                            >
                              View all <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          }
                        />
                        <div>
                          {uiOrders.length === 0 ? (
                            <EmptyState icon={Package} title="No orders yet" sub="Start shopping to see your orders here" cta={<Link to="/search" style={{ padding: '9px 20px', borderRadius: 10, background: PRIMARY, color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Browse Products</Link>} />
                          ) : (
                            uiOrders.slice(0, 4).map((o, i, arr) => {
                              const s = STATUS[o.status] || STATUS.processing;
                              const Icon = s.icon;
                              return (
                                <div key={o.id}>
                                  <div
                                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.03)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div style={{
                                        width: 34, height: 34, borderRadius: 10,
                                        background: `${s.bg}22`,
                                        border: `1px solid ${s.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                      }}>
                                        <Icon style={{ width: 16, height: 16, color: s.color }} />
                                      </div>
                                      <div>
                                        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{o.id}</p>
                                        <p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-faint)' }}>{o.date} · {o.seller} · {o.items} item{o.items !== 1 ? 's' : ''}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <span style={{
                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                        background: `${s.bg}33`, color: s.color,
                                        border: `1px solid ${s.color}30`,
                                      }}>{s.label}</span>
                                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>${o.total.toFixed(2)}</span>
                                      <Link to={`/track/${o.id}`}><ChevronRight style={{ width: 14, height: 14, color: 'var(--text-faint)' }} /></Link>
                                    </div>
                                  </div>
                                  {i < arr.length - 1 && <div style={{ height: 1, margin: '0 20px', background: 'var(--divider)' }} />}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </Card>

                      {/* Buyer Protection Banner */}
                      <div style={{
                        borderRadius: 16, padding: '16px 20px',
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))',
                        border: '1px solid rgba(96,165,250,0.2)',
                        borderLeft: '3px solid #3b82f6',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                          background: 'rgba(59,130,246,0.12)',
                          border: '1px solid rgba(96,165,250,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Shield style={{ width: 20, height: 20, color: '#60a5fa' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: '#60a5fa' }}>Buyer Protection Active</p>
                          <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>Every purchase on Reaglex is protected by escrow. Funds are only released when you confirm delivery.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── MY ORDERS ── */}
                  {tab === 'orders' && (() => {
                    const orderStatusTabs = [{ id: 'all', label: 'All' }, { id: 'processing', label: 'Processing' }, { id: 'shipped', label: 'Shipped' }, { id: 'delivered', label: 'Delivered' }, { id: 'cancelled', label: 'Cancelled' }];
                    const dateRangeOptions = [{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 3 months' }, { value: '365', label: 'This year' }, { value: 'all', label: 'All time' }];
                    const q = ordersSearch.toLowerCase().trim();
                    let filteredOrders = uiOrders.filter((o) => {
                      if (ordersStatus !== 'all' && o.status !== ordersStatus) return false;
                      if (q && !o.id.toLowerCase().includes(q) && !o.seller.toLowerCase().includes(q)) return false;
                      return true;
                    });
                    filteredOrders = ordersSort === 'oldest' ? [...filteredOrders].reverse() : filteredOrders;
                    return (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>My Orders</h2>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: 'rgba(249,115,22,0.1)', color: PRIMARY,
                            border: '1px solid rgba(249,115,22,0.2)',
                          }}>{filteredOrders.length}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px', borderRadius: 10,
                          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        }}>
                          <Search style={{ width: 14, height: 14, color: 'var(--text-faint)' }} />
                          <input
                            type="text" value={ordersSearch}
                            onChange={(e) => setOrdersSearch(e.target.value)}
                            placeholder="Search orders..."
                            style={{
                              background: 'transparent', border: 'none', outline: 'none',
                              fontSize: 13, color: 'var(--text-primary)', width: 160,
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                          {orderStatusTabs.map((s) => (
                            <button
                              key={s.id} type="button" onClick={() => setOrdersStatus(s.id)}
                              style={{
                                padding: '7px 12px', fontSize: 12, fontWeight: ordersStatus === s.id ? 700 : 500,
                                background: ordersStatus === s.id ? PRIMARY : 'var(--card-bg)',
                                color: ordersStatus === s.id ? 'white' : 'var(--text-muted)',
                                border: 'none', cursor: 'pointer',
                                borderRight: '1px solid var(--card-border)',
                              }}
                            >{s.label}</button>
                          ))}
                        </div>
                        <select
                          value={ordersDateRange} onChange={(e) => setOrdersDateRange(e.target.value)}
                          style={{
                            padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                            color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer',
                          }}
                        >
                          {dateRangeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <select
                          value={ordersSort} onChange={(e) => setOrdersSort(e.target.value)}
                          style={{
                            padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                            color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer',
                          }}
                        >
                          <option value="newest">Newest first</option>
                          <option value="oldest">Oldest first</option>
                        </select>
                      </div>
                      {ordersLoading && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Loading your orders...
                        </p>
                      )}
                      {ordersError && !ordersLoading && (
                        <p className="text-sm" style={{ color: '#f97373' }}>
                          {ordersError}
                        </p>
                      )}
                      {!ordersLoading && !ordersError && filteredOrders.map((o, oi) => {
                        const s = STATUS[o.status] || STATUS.processing;
                        const Icon = s.icon;
                        return (
                          <motion.div
                            key={o.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: oi * 0.05, duration: 0.25 }}
                            style={{
                              background: 'var(--card-bg)',
                              border: '1px solid var(--card-border)',
                              borderRadius: 18,
                              overflow: 'hidden',
                              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                            }}
                          >
                            <div style={{ padding: '18px 20px' }}>
                              <div className="flex items-start justify-between" style={{ marginBottom: 14 }}>
                                <div className="flex items-start gap-3">
                                  <div style={{
                                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                    background: `${s.bg}22`, border: `1px solid ${s.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    <Icon style={{ width: 16, height: 16, color: s.color }} />
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{o.id}</p>
                                    <p style={{ fontSize: 11, marginTop: 3, color: 'var(--text-faint)' }}>{o.date} · {o.seller} · {o.items} item{o.items !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <span style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: `${s.bg}22`, color: s.color,
                                  border: `1px solid ${s.color}28`,
                                }}><Icon style={{ width: 11, height: 11 }} />{s.label}</span>
                              </div>
                              <div style={{ height: 1, background: 'var(--divider)', marginBottom: 14 }} />
                              <div className="flex items-center justify-between">
                                <p style={{ fontWeight: 800, fontSize: 16, color: PRIMARY }}>${o.total.toFixed(2)}</p>
                                <div className="flex gap-2">
                                  {o.status !== 'cancelled' && (
                                    <Link to={`/track/${o.id}`}>
                                      <motion.button
                                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 6,
                                          padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                                          background: 'rgba(249,115,22,0.09)',
                                          color: PRIMARY, border: '1px solid rgba(249,115,22,0.2)',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <Truck style={{ width: 13, height: 13 }} /> Track
                                      </motion.button>
                                    </Link>
                                  )}
                                  <Link to={`/returns?order=${o.id}`}>
                                    <motion.button
                                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                                        color: 'var(--text-secondary)', cursor: 'pointer',
                                      }}
                                    >
                                      <RotateCcw style={{ width: 13, height: 13 }} /> Return
                                    </motion.button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    );
                  })()}

                  {/* ── WISHLIST (Tier 4 + 5 + 6) ── */}
                  {tab === 'wishlist' && (() => {
                    const wishlistSortOptions = [{ value: 'recent', label: 'Recently Added' }, { value: 'price_asc', label: 'Price Low-High' }, { value: 'price_desc', label: 'Price High-Low' }, { value: 'rating', label: 'Top Rated' }];
                    const searchLower = wishlistSearch.toLowerCase().trim();
                    let displayItems = wishlistItems.filter((item) => {
                      const p = item.product || {};
                      const name = (p.title || p.name || '').toLowerCase();
                      return !searchLower || name.includes(searchLower);
                    });
                    if (sortBy === 'price_asc') displayItems = [...displayItems].sort((a, b) => (a.product?.price ?? 0) - (b.product?.price ?? 0));
                    if (sortBy === 'price_desc') displayItems = [...displayItems].sort((a, b) => (b.product?.price ?? 0) - (a.product?.price ?? 0));
                    if (sortBy === 'rating') displayItems = [...displayItems].sort((a, b) => (b.product?.averageRating ?? b.product?.rating ?? 0) - (a.product?.averageRating ?? a.product?.rating ?? 0));
                    return (
                    <div className="space-y-6">
                      {/* Top bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Wishlist & Recently Viewed</h2>
                          <span className="px-3 py-1 rounded-full text-sm font-semibold text-white" style={{ background: PRIMARY }}>
                            {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
                          </span>
                          <input type="text" value={wishlistSearch} onChange={(e) => setWishlistSearch(e.target.value)} placeholder="Search saved items..." className="px-3 py-2 rounded-lg border text-sm w-44" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }} />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 relative">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Sort by:</span>
                            <button type="button" onClick={() => setWishlistSortOpen((v) => !v)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}>
                              {wishlistSortOptions.find((o) => o.value === sortBy)?.label || 'Recently Added'} <ChevronDown className="w-4 h-4" />
                            </button>
                            {wishlistSortOpen && (
                              <div className="absolute top-full left-0 mt-1 py-1 rounded-lg border shadow-lg z-10 min-w-[160px]" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-hover)' }}>
                                {wishlistSortOptions.map((opt) => (
                                  <button key={opt.value} type="button" onClick={() => { setSortBy(opt.value); setWishlistSortOpen(false); }} className="w-full text-left px-3 py-2 text-sm" style={{ color: sortBy === opt.value ? PRIMARY : 'var(--text-secondary)', fontWeight: sortBy === opt.value ? 600 : 400 }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-active)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>{opt.label}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--divider-strong)' }}>
                            <button onClick={() => setViewMode('grid')} className="p-2" style={{ background: viewMode === 'grid' ? PRIMARY : 'var(--card-bg)', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)' }}>
                              <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('list')} className="p-2" style={{ background: viewMode === 'list' ? PRIMARY : 'var(--card-bg)', color: viewMode === 'list' ? 'white' : 'var(--text-muted)' }}>
                              <List className="w-4 h-4" />
                            </button>
                          </div>
                          <Link to="/search" className="text-sm font-semibold hover:underline" style={{ color: PRIMARY }}>
                            Browse More →
                          </Link>
                        </div>
                      </div>

                      {/* Wishlist grid */}
                      {displayItems.length === 0 ? (
                        <Card className="py-12">
                          <EmptyState
                            icon={Heart}
                            title={wishlistSearch ? 'No matching items' : 'Your wishlist is empty'}
                            sub={wishlistSearch ? 'Try a different search' : 'Save items you love and find them here later'}
                            cta={
                              wishlistSearch ? null : (
                              <Link to="/search">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-2 px-6 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: PRIMARY }}>
                                  Browse Products →
                                </motion.button>
                              </Link>
                              )
                            }
                          />
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ gap: 20 }}>
                          <AnimatePresence>
                          {displayItems.map((item) => {
                            const p = item.product || {};
                            const pid = p._id || p.id || item.product_id;
                            const title = p.title || p.name || 'Product';
                            const price = p.price ?? 0;
                            const oldPrice = p.compareAtPrice ?? p.originalPrice;
                            const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
                            const imgSrc = resolveImg(p.images?.[0] || p.image);
                            const category = p.category || 'Accessories';
                            const storeName = p.seller?.storeName || p.sellerName || 'Premium Store';
                            const rating = p.averageRating ?? p.rating ?? 4.5;
                            const reviewCount = p.reviewCount ?? 12;

                            return (
                              <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className="rounded-2xl overflow-hidden group"
                                style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}
                              >
                                <div className="relative" style={{ height: 200, background: 'var(--bg-tertiary)' }}>
                                  <img src={imgSrc} alt={title} className="w-full h-full object-cover" onError={(e) => { e.target.src = resolveImg(null); }} />
                                  {discount > 0 && (
                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: '#dc2626' }}>SALE</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeFromWishlist(item.id)}
                                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-red-50 transition"
                                    aria-label="Remove from wishlist"
                                  >
                                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                                  </button>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Link to={`/products/${pid}`}>
                                      <button className="px-3 py-2 rounded-lg text-white text-xs font-semibold bg-white/20 hover:bg-white/30 transition">Quick View</button>
                                    </Link>
                                    <button
                                      onClick={() => addItem(p, 1)}
                                      className="px-3 py-2 rounded-lg text-white text-xs font-semibold"
                                      style={{ background: PRIMARY }}
                                    >
                                      Add to Cart
                                    </button>
                                  </div>
                                </div>
                                <div className="p-4">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2" style={{ background: 'var(--brand-light)', color: PRIMARY }}>{category}</span>
                                  <h3 className="font-bold text-[15px] leading-snug line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                                  <p className="text-xs mb-2" style={{ color: 'var(--text-faint)' }}>by {storeName}</p>
                                  <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                      <Star key={i} className="w-3.5 h-3.5" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" />
                                    ))}
                                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{rating} ({reviewCount})</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <span className="font-bold text-lg" style={{ color: PRIMARY }}>${price.toFixed(2)}</span>
                                    {oldPrice && <span className="text-[13px] line-through" style={{ color: 'var(--text-faint)' }}>${oldPrice.toFixed(2)}</span>}
                                    {discount > 0 && <span className="px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ background: '#dc2626' }}>-{discount}%</span>}
                                  </div>
                                  <div className="flex items-center gap-1 mb-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-50">
                                      <Truck className="w-3 h-3" /> Free Ship
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => removeFromWishlist(item.id)}
                                      className="flex-1 py-2 rounded-lg text-sm font-semibold border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    >
                                      ♡ Remove
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addItem(p, 1)}
                                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition"
                                      style={{ background: PRIMARY }}
                                    >
                                      Add to Cart
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Recently Viewed (Tier 5) */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Recently Viewed 👁</h3>
                          {recentItems.length > 0 && (
                            <button type="button" onClick={clearRecent} className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>Clear all</button>
                          )}
                        </div>
                        <div ref={recentScrollRef} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                          {recentItems.length === 0 ? (
                            <p className="text-sm py-4" style={{ color: 'var(--text-faint)' }}>No recently viewed items.</p>
                          ) : (
                            recentItems.map((p, i) => (
                              <Link key={i} to={`/products/${p._id || p.id}`} className="flex-shrink-0 w-[160px] rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}>
                                <div style={{ height: 120, background: 'var(--bg-tertiary)' }}>
                                  <img src={resolveImg(p.image)} alt={p.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-2">
                                  <p className="text-xs font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                                  <p className="text-sm font-bold mt-0.5" style={{ color: PRIMARY }}>${(p.price || 0).toFixed(2)}</p>
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Promo card (Tier 6) */}
                      <div className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                        <div>
                          <p className="font-bold text-lg text-white">🛍️ Special Offer</p>
                          <p className="text-white/90 text-sm mt-1">Get 10% off your next purchase</p>
                        </div>
                        <Link to="/search">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-5 py-2.5 rounded-lg font-semibold text-white border-2 border-white/80 hover:bg-white/20 transition">
                            Shop Now →
                          </motion.button>
                        </Link>
                      </div>
                    </div>
                    );
                  })()}

                  {/* ── ADDRESSES (Tiers 3–10) ── */}
                  {tab === 'addresses' && (
                    <div className="space-y-5">
                      {/* Content header */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 className="font-bold text-[22px]" style={{ color: 'var(--text-primary)' }}>Saved Addresses</h2>
                          <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>{addresses.length} address{addresses.length !== 1 ? 'es' : ''} saved</span>
                        </div>
                        <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setAddressEditId(null); setAddressForm({ type: 'home', default: false }); setAddressModalOpen(true); }} className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-white shadow-lg transition-shadow hover:shadow-xl" style={{ background: PRIMARY }}>
                          <MapPin className="w-4 h-4" /> Add New Address
                        </motion.button>
                      </div>

                      {/* Tip banner */}
                      {!tipDismissed && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                          <span className="text-sm text-blue-700 dark:text-blue-300">💡 Tip: Set a default address to speed up checkout</span>
                          <button type="button" onClick={() => setTipDismissed(true)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"><X className="w-4 h-4 text-blue-700 dark:text-blue-400" /></button>
                        </motion.div>
                      )}

                      {addressesLoading && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Loading your addresses...
                        </p>
                      )}
                      {addressesError && !addressesLoading && (
                        <p className="text-sm" style={{ color: '#f97373' }}>
                          {addressesError}
                        </p>
                      )}
                      {!addressesLoading && addresses.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
                          <motion.div className="mb-4 address-pin-bounce text-5xl">📍</motion.div>
                          <p className="font-bold text-xl mb-2 text-[var(--text-muted)]">No addresses saved yet</p>
                          <p className="text-sm text-center max-w-sm mb-6 text-[var(--text-faint)]">Add your first delivery address to speed up checkout</p>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setAddressEditId(null); setAddressForm({ type: 'home', default: false }); setAddressModalOpen(true); }} className="px-5 py-2.5 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>+ Add Your First Address</motion.button>
                        </motion.div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {addresses.map((addr, idx) => {
                            const typeConfig = ADDRESS_TYPES.find((t) => t.id === addr.type) || ADDRESS_TYPES[0];
                            const isDefault = addr.default;
                            const fullText = [addr.line1, addr.line2, `${addr.city}, ${addr.state} ${addr.zip}`, addr.country].filter(Boolean).join(', ');
                            return (
                              <motion.div
                                key={addr.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + idx * 0.1, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                className={`relative rounded-2xl p-5 border-2 ${isDefault ? 'address-default-pulse' : ''}`}
                                style={{
                                  background: isDefault ? 'var(--success-light)' : 'var(--card-bg)',
                                  borderColor: isDefault ? DEFAULT_GREEN : 'var(--card-border)',
                                  boxShadow: 'var(--card-shadow)',
                                  transition: 'border-color 0.4s, transform 0.25s, box-shadow 0.25s',
                                }}
                                onMouseEnter={(e) => { if (!isDefault) e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
                                onMouseLeave={(e) => { if (!isDefault) e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
                              >
                                {isDefault && (
                                  <div className="absolute top-0 right-0 overflow-hidden" style={{ width: 80, height: 80 }}>
                                    <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold text-white uppercase transform rotate-45 translate-x-4 -translate-y-1" style={{ background: DEFAULT_GREEN }}>Default</span>
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 border border-gray-100"
                                      style={{ background: typeConfig.circleBg, color: typeConfig.circleColor || '#111827' }}
                                    >
                                      {typeConfig.icon}
                                    </div>
                                    <div>
                                      <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{typeConfig.label}</p>
                                      {isDefault ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: DEFAULT_GREEN }}><Check className="w-3 h-3" /> Default</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              setAddressesLoading(true);
                                              const payload = {
                                                label: (addr.type || 'home').charAt(0).toUpperCase() + (addr.type || 'home').slice(1),
                                                street: addr.line2
                                                  ? `${addr.line1}, ${addr.line2}`
                                                  : addr.line1,
                                                city: addr.city,
                                                state: addr.state,
                                                zipCode: addr.zip,
                                                country: addr.country,
                                                isDefault: true,
                                              };
                                              await api.put(`/profile/me/addresses/${addr.index}`, payload);
                                              const res = await api.get('/profile/me');
                                              const profileUser = res.data?.user;
                                              const apiAddresses = profileUser?.addresses || [];
                                              const mapped = apiAddresses
                                                .map((aAddr, index) => mapApiAddressToUi(aAddr, index, profileUser))
                                                .filter(Boolean);
                                              setAddresses(mapped);
                                              showToast('Default address updated');
                                            } catch (err) {
                                              console.error('Failed to set default address', err);
                                              showToast('Failed to update default address', 'error');
                                            } finally {
                                              setAddressesLoading(false);
                                            }
                                          }}
                                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                                          style={{ color: 'var(--text-muted)' }}
                                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                          Set as Default
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => { setAddressEditId(addr.id); setAddressForm({ ...addr }); setAddressModalOpen(true); }} className="p-2 rounded-lg hover:bg-orange-50 transition-colors" title="Edit"><Edit3 className="w-4 h-4 text-[var(--text-muted)]" /></button>
                                    <div className="relative" data-delete-popover>
                                      <button type="button" onClick={() => addr.default ? null : setDeleteConfirmId(addr.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors" title={addr.default ? 'Set another as default first' : 'Delete'}><Trash2 className={`w-4 h-4 ${addr.default ? 'text-[var(--text-faint)]' : 'text-[var(--text-muted)]'}`} /></button>
                                      {deleteConfirmId === addr.id && (
                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute right-0 top-full mt-1 p-3 rounded-xl shadow-xl border z-20 min-w-[180px]" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-hover)' }}>
                                          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Delete this address?</p>
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setDeleteConfirmId(null)}
                                              className="flex-1 py-1.5 rounded-lg text-sm font-semibold border"
                                              style={{ borderColor: 'var(--divider-strong)', color: 'var(--text-secondary)', background: 'var(--btn-secondary-bg)' }}
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  setAddressesLoading(true);
                                                  await api.delete(`/profile/me/addresses/${addr.index}`);
                                                  const res = await api.get('/profile/me');
                                                  const profileUser = res.data?.user;
                                                  const apiAddresses = profileUser?.addresses || [];
                                                  const mapped = apiAddresses
                                                    .map((aAddr, index) => mapApiAddressToUi(aAddr, index, profileUser))
                                                    .filter(Boolean);
                                                  setAddresses(mapped);
                                                  showToast('Address removed');
                                                } catch (err) {
                                                  console.error('Failed to delete address', err);
                                                  showToast('Failed to delete address', 'error');
                                                } finally {
                                                  setAddressesLoading(false);
                                                  setDeleteConfirmId(null);
                                                }
                                              }}
                                              className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white"
                                              style={{ background: '#ef4444' }}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </motion.div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <p className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{addr.fullName}</p>
                                <p className="text-[13px] flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}><span>📞</span> {addr.phone}</p>
                                <p className="text-sm flex items-start gap-1.5 mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}><MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /> {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                                <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>{addr.city}, {addr.state} {addr.zip}, {addr.country}</p>
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--divider)' }}>
                                  <Link to="/checkout" className="text-sm font-semibold hover:underline" style={{ color: PRIMARY }}>Use for Checkout →</Link>
                                  <button type="button" onClick={() => { navigator.clipboard.writeText(fullText); setCopiedAddressId(addr.id); showToast('Copied! ✓', 'success', 2000); setTimeout(() => setCopiedAddressId(null), 2000); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Copy address">{copiedAddressId === addr.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}</button>
                                </div>
                              </motion.div>
                            );
                          })}
                          {/* Add New Address card */}
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + addresses.length * 0.1 }}
                            onClick={() => { setAddressEditId(null); setAddressForm({ type: 'home', default: false }); setAddressModalOpen(true); }}
                            className="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center min-h-[240px]"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--divider-strong)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.background = 'var(--bg-active)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--divider-strong)'; e.currentTarget.style.background = 'var(--card-bg)'; }}
                          >
                            <motion.span whileHover={{ scale: 1.1 }} className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mb-3" style={{ background: 'var(--brand-light)', color: PRIMARY }}>+</motion.span>
                            <p className="font-bold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>Add New Address</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Save time at checkout</p>
                          </motion.button>
                        </div>
                      )}

                      {/* Add/Edit Address Modal */}
                      <AnimatePresence>
                        {addressModalOpen && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setAddressModalOpen(false)}>
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-hover)' }} onClick={(e) => e.stopPropagation()}>
                              <div className="p-6 border-b" style={{ borderColor: 'var(--divider)' }}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{addressEditId ? 'Edit Address' : 'Add New Address'}</h3>
                                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>This address will be saved to your account</p>
                                    <div className="mt-2 h-0.5 w-12 rounded" style={{ background: PRIMARY }} />
                                  </div>
                                  <motion.button type="button" whileHover={{ rotate: 90 }} onClick={() => setAddressModalOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}><X className="w-5 h-5" /></motion.button>
                                </div>
                              </div>
                              <form
                                className="p-6 space-y-4"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const fd = new FormData(e.target);
                                  const data = {
                                    fullName: fd.get('fullName'),
                                    phone: fd.get('phone'),
                                    line1: fd.get('line1'),
                                    line2: fd.get('line2'),
                                    city: fd.get('city'),
                                    state: fd.get('state'),
                                    zip: fd.get('zip'),
                                    country: fd.get('country'),
                                    type: fd.get('type') || 'home',
                                    default: fd.get('default') === 'on',
                                  };
                                  const payload = {
                                    label: String(data.type).charAt(0).toUpperCase() + String(data.type).slice(1),
                                    street: data.line2
                                      ? `${data.line1}, ${data.line2}`
                                      : data.line1,
                                    city: data.city,
                                    state: data.state,
                                    zipCode: data.zip,
                                    country: data.country,
                                    isDefault: data.default,
                                  };
                                  const save = async () => {
                                    try {
                                      setAddressSaving(true);
                                      if (addressEditId != null) {
                                        const current = addresses.find((a) => a.id === addressEditId);
                                        const index = current?.index ?? 0;
                                        await api.put(`/profile/me/addresses/${index}`, payload);
                                      } else {
                                        await api.post('/profile/me/addresses', payload);
                                      }
                                      const res = await api.get('/profile/me');
                                      const profileUser = res.data?.user;
                                      const apiAddresses = profileUser?.addresses || [];
                                      const mapped = apiAddresses
                                        .map((aAddr, index) => mapApiAddressToUi(aAddr, index, profileUser))
                                        .filter(Boolean);
                                      setAddresses(mapped);
                                      showToast('✓ Address saved successfully!');
                                      setAddressModalOpen(false);
                                    } catch (err) {
                                      console.error('Failed to save address', err);
                                      showToast('Failed to save address', 'error');
                                    } finally {
                                      setAddressSaving(false);
                                    }
                                  };
                                  save();
                                }}
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Full Name *</label>
                                    <input name="fullName" required defaultValue={addressForm?.fullName} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Phone Number *</label>
                                    <input name="phone" type="tel" required defaultValue={addressForm?.phone} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Address Line 1 *</label>
                                  <input name="line1" required defaultValue={addressForm?.line1} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Address Line 2 (optional)</label>
                                  <input name="line2" defaultValue={addressForm?.line2} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>City *</label>
                                    <input name="city" required defaultValue={addressForm?.city} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>State/Province *</label>
                                    <input name="state" required defaultValue={addressForm?.state} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>ZIP/Postal Code *</label>
                                    <input name="zip" required defaultValue={addressForm?.zip} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Country *</label>
                                    <input name="country" required defaultValue={addressForm?.country} className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Address Type</label>
                                  <div className="flex gap-2">
                                    {ADDRESS_TYPES.map((t) => (
                                      <label
                                        key={t.id}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer"
                                        style={{
                                          borderColor: (addressForm?.type || 'home') === t.id ? PRIMARY : 'var(--divider-strong)',
                                          background: (addressForm?.type || 'home') === t.id ? 'var(--bg-active)' : 'var(--input-bg)',
                                        }}
                                      >
                                        <input type="radio" name="type" value={t.id} checked={(addressForm?.type || 'home') === t.id} className="sr-only" onChange={() => setAddressForm((f) => ({ ...f, type: t.id }))} />
                                        <span>{t.icon}</span> <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" name="default" defaultChecked={addressForm?.default} className="w-4 h-4 rounded" style={{ accentColor: PRIMARY }} />
                                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Set as default address</span>
                                </label>
                                <div className="flex gap-3 pt-4">
                                  <button type="button" onClick={() => setAddressModalOpen(false)} className="flex-1 py-3 rounded-xl font-semibold border-2" style={{ borderColor: 'var(--divider-strong)', color: 'var(--text-secondary)', background: 'var(--btn-secondary-bg)' }}>Cancel</button>
                                  <motion.button type="submit" disabled={addressSaving} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: PRIMARY }}>
                                    {addressSaving && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Save Address →
                                  </motion.button>
                                </div>
                              </form>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── PAYMENT METHODS ── */}
                  {tab === 'payments' && <PaymentsTabContent />}
                  {false && (
                    <div className="space-y-6">
                      {/* Escrow wallet balance card */}
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="rounded-2xl relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
                          border: '1px solid rgba(249,115,22,0.8)',
                          boxShadow: '0 8px 32px rgba(249,115,22,0.15)',
                        }}
                      >
                        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(249,115,22,0.35), transparent 55%)' }} />
                        <div className="relative z-10 px-6 sm:px-8 pt-6 pb-4 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Total spent */}
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.14)' }}>
                                <span className="text-lg">💰</span>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Total Spent</p>
                                <p className="mt-1 text-[26px] font-bold leading-none text-[var(--text-primary)]">
                                  <CurrencyCountUp value={227.49} />
                                </p>
                                <p className="text-[11px] mt-1 text-[var(--text-faint)]">All time on Reaglex</p>
                                <p className="text-[11px] mt-1 font-medium text-green-500">+ $29 this month</p>
                              </div>
                            </div>
                            {/* In escrow */}
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center escrow-pulse bg-blue-100 dark:bg-blue-900/30">
                                <span className="text-lg">🔒</span>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">In Escrow</p>
                                <p className="mt-1 text-[26px] font-bold leading-none escrow-value-glow text-orange-500">
                                  <CurrencyCountUp value={29.0} />
                                </p>
                                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Currently held for active orders</p>
                                <p className="text-[11px] mt-1 font-medium text-orange-500">1 order pending</p>
                              </div>
                            </div>
                            {/* Released */}
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/20">
                                <span className="text-lg">✅</span>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Released</p>
                                <p className="mt-1 text-[26px] font-bold leading-none text-green-500">
                                  <CurrencyCountUp value={198.49} />
                                </p>
                                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Successfully paid out to sellers</p>
                                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Last: Feb 28</p>
                              </div>
                            </div>
                            {/* Refunded */}
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/20">
                                <span className="text-lg">🔄</span>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Refunded</p>
                                <p className="mt-1 text-[26px] font-bold leading-none text-[var(--text-primary)]">
                                  <CurrencyCountUp value={0} />
                                </p>
                                <p className="text-[11px] mt-1 text-[var(--text-faint)]">Total refunded back to you</p>
                                <p className="text-[11px] mt-1 text-[var(--text-faint)]">No refunds</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs">
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                              🛡️ Escrow Protection: ACTIVE
                            </span>
                            <span className="text-[var(--text-faint)]">Platform fee: 5% per transaction</span>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 dark:text-orange-300 hover:text-orange-500 transition-colors"
                            >
                              View Full Transaction History
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      {/* Main layout: left content + right sidebar */}
                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)] gap-6 items-start">
                        {/* Left column */}
                        <div className="space-y-6">
                          {/* Active escrow orders */}
                          <Card className="border border-\[var\(--divider\)\]">
                            <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-2 border-b border-\[var\(--divider\)\]">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🔒</span>
                                <h2 className="font-bold text-base text-[var(--text-primary)]">Active Escrow Holdings</h2>
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                {activeEscrowOrders.length} order
                              </span>
                            </div>
                            <div className="p-5 space-y-4">
                              {activeEscrowOrders.map((o) => {
                                const diff = Math.max(0, o.releaseAt - now);
                                const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                                const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
                                const minutes = Math.floor((diff / (60 * 1000)) % 60);
                                const seconds = Math.floor((diff / 1000) % 60);
                                const under24h = diff <= 24 * 60 * 60 * 1000;
                                const countdownLabel = diff > 0
                                  ? `Auto-releases in: ${days}d ${hours}h ${minutes}m ${seconds}s`
                                  : 'Eligible for release now';

                                const steps = ['Paid', 'Held', 'Shipped', 'Confirm', 'Released'];
                                const statusIndex = o.status === 'ESCROW_HOLD' ? 1 : o.status === 'SHIPPED' ? 2 : o.status === 'DELIVERED' ? 3 : 4;

                                return (
                                  <motion.div
                                    key={o.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="rounded-2xl border border-orange-100/80 dark:border-orange-900/30 bg-white/80 dark:bg-gray-800/80 p-4 flex flex-col gap-3 escrow-row-pulse"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-\[var\(--bg-tertiary\)\]">
                                        <img src={o.image} alt={o.productName} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-[var(--text-muted)]">Order {o.id}</p>
                                        <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{o.productName}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-bold" style={{ color: PRIMARY }}>${o.amount.toFixed(2)}</p>
                                        <span
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1"
                                          style={{
                                            background: o.status === 'ESCROW_HOLD' ? '#fff7ed' : o.status === 'SHIPPED' ? '#dbeafe' : o.status === 'DISPUTED' ? '#fee2e2' : '#dcfce7',
                                            color: o.status === 'ESCROW_HOLD' ? '#ea580c' : o.status === 'SHIPPED' ? '#2563eb' : o.status === 'DISPUTED' ? '#b91c1c' : '#15803d',
                                          }}
                                        >
                                          {o.status === 'ESCROW_HOLD' && <>🔒 Funds Held</>}
                                          {o.status === 'SHIPPED' && <>🚚 In Transit</>}
                                          {o.status === 'DISPUTED' && <>⚠️ Disputed</>}
                                          {o.status === 'RELEASED' && <>✅ Released</>}
                                        </span>
                                      </div>
                                    </div>
                                    {/* mini escrow timeline */}
                                    <div className="mt-1">
                                      <div className="flex items-center justify-between text-[11px] font-medium mb-1 text-[var(--text-muted)]">
                                        {steps.map((label, idx) => {
                                          const done = idx <= statusIndex;
                                          const current = idx === statusIndex;
                                          return (
                                            <div key={label} className="flex-1 flex flex-col items-center">
                                              <div
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${current ? 'escrow-step-pulse' : ''} ${done ? 'text-white' : 'bg-gray-200 dark:bg-gray-600 text-[var(--text-muted)]'}`}
                                                style={done ? { background: PRIMARY } : {}}
                                              >
                                                {done ? '✓' : ''}
                                              </div>
                                              <span className="mt-1">{label}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="h-1 rounded-full overflow-hidden bg-gray-200 mt-1">
                                        <div
                                          className="h-full rounded-full"
                                          style={{ width: `${(statusIndex / (steps.length - 1)) * 100}%`, background: `linear-gradient(90deg, ${PRIMARY}, #facc15)` }}
                                        />
                                      </div>
                                    </div>
                                    {/* countdown & actions */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
                                      <p className={`text-xs font-medium ${under24h ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
                                        {countdownLabel}
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setConfirmEscrowOrder(o)}
                                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                                          style={{ background: PRIMARY }}
                                        >
                                          ✅ Confirm Delivery
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { setDisputeEscrowOrder(o); setDisputeStep(1); }}
                                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        >
                                          ⚠️ Raise Dispute
                                        </button>
                                        <Link
                                          to={`/track/${o.id}`}
                                          className="px-2 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                        >
                                          📦 Track Order
                                        </Link>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </Card>

                          {/* Saved payment methods */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <h2 className="font-bold text-lg text-[var(--text-primary)]">Saved Payment Methods</h2>
                              <button
                                type="button"
                                onClick={() => setAddMethodOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                                style={{ background: PRIMARY }}
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Method
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Example Visa card */}
                              <Card className="p-4 hover:shadow-xl transition-shadow">
                                <div
                                  className="w-full h-[110px] rounded-2xl mb-3 transform-gpu hover:-rotate-y-3 hover:translate-y-0.5 transition-transform duration-300"
                                  style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}
                                >
                                  <div className="h-full flex flex-col justify-between px-4 py-3 text-white text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">Reaglex Wallet</span>
                                      <span className="font-black text-base tracking-[0.18em]">VISA</span>
                                    </div>
                                    <div>
                                      <p className="font-semibold tracking-[0.25em] text-sm">•••• •••• •••• 4242</p>
                                      <div className="flex items-center justify-between mt-2 text-[10px] opacity-80">
                                        <span>Thierry NTWARI</span>
                                        <span>12/27</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <p className="font-semibold text-[var(--text-primary)]">Visa ending in 4242</p>
                                    <p className="mt-0.5 text-[var(--text-muted)]">Expires 12/27 · Name on card: Thierry NTWARI</p>
                                  </div>
                                  <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">✓ Default</span>
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs">
                                  <div className="flex items-center gap-3">
                                    <button type="button" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                      ✏️ Edit
                                    </button>
                                    <button type="button" className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-600 transition-colors">
                                      🗑️ Delete
                                    </button>
                                  </div>
                                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: PRIMARY }}>
                                    Use for Next Checkout
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </Card>

                              {/* Example MTN MoMo */}
                              <Card className="p-4 hover:shadow-xl transition-shadow">
                                <div
                                  className="w-full h-[110px] rounded-2xl mb-3 transform-gpu hover:-rotate-y-3 hover:translate-y-0.5 transition-transform duration-300"
                                  style={{ background: 'linear-gradient(135deg,#facc15,#eab308)' }}
                                >
                                  <div className="h-full flex flex-col justify-between px-4 py-3 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-base text-gray-800">MTN MoMo</span>
                                      <span className="text-[10px] uppercase tracking-[0.18em] text-gray-800">Rwanda</span>
                                    </div>
                                    <div>
                                      <p className="font-semibold tracking-[0.12em] text-gray-900">+250 788 *** 123</p>
                                      <p className="mt-1 text-[10px] text-gray-800">Name: Thierry NTWARI</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <p className="font-semibold text-[var(--text-primary)]">MTN MoMo ••• 3123</p>
                                    <p className="mt-0.5 text-[var(--text-muted)]">Primary mobile wallet</p>
                                  </div>
                                  <button type="button" className="px-2 py-1 rounded-full text-[11px] font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Set as Default
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs">
                                  <div className="flex items-center gap-3">
                                    <button type="button" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                      ✏️ Edit
                                    </button>
                                    <button type="button" className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-600 transition-colors">
                                      🗑️ Delete
                                    </button>
                                  </div>
                                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: PRIMARY }}>
                                    Use for Next Checkout
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </Card>
                            </div>

                            {/* Supported methods */}
                            <Card className="p-5">
                              <p className="font-semibold text-sm mb-3 text-[var(--text-primary)]">We Accept</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                {[
                                  'Visa',
                                  'Mastercard',
                                  'American Express',
                                  'Discover',
                                  'PayPal',
                                  'Apple Pay',
                                  'Google Pay',
                                  'Stripe',
                                  'MTN MoMo 🇷🇼',
                                  'Airtel Money',
                                  'M-Pesa',
                                  'Orange Money',
                                  'Bank Transfer',
                                  'Wire Transfer',
                                ].map((m) => (
                                  <div
                                    key={m}
                                    className="flex items-center justify-center px-2.5 py-2 rounded-xl border border-\[var\(--divider-strong\)\] text-[11px] font-medium text-[var(--text-muted)] hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                                  >
                                    <span className="opacity-70 hover:opacity-100 transition-opacity">{m}</span>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>

                          {/* Transaction history */}
                          <Card className="p-5 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📊</span>
                                <h2 className="font-bold text-base text-[var(--text-primary)]">Transaction History</h2>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <select className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-secondary)] text-xs focus:outline-none" defaultValue="30">
                                  <option value="7">Last 7 days</option>
                                  <option value="30">Last 30 days</option>
                                  <option value="90">Last 90 days</option>
                                </select>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-secondary)] text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                  📥 Download CSV
                                </button>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                                    style={{ width: 180 }}
                                  />
                                  <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-[var(--text-faint)]" />
                                </div>
                              </div>
                            </div>

                            {/* Filter tabs */}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {['All', 'Payments', 'Escrow Holds', 'Releases', 'Refunds', 'Fees'].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                                    t === 'All'
                                      ? 'text-white'
                                      : 'bg-\[var\(--bg-tertiary\)\] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                  style={t === 'All' ? { background: PRIMARY } : {}}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>

                            {/* Table — desktop */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-[var(--text-muted)]">
                                    <th className="py-2 font-medium">Date</th>
                                    <th className="py-2 font-medium">Order</th>
                                    <th className="py-2 font-medium">Type</th>
                                    <th className="py-2 font-medium">Method</th>
                                    <th className="py-2 font-medium text-right">Amount</th>
                                    <th className="py-2 font-medium text-right">Fee</th>
                                    <th className="py-2 font-medium text-right">Net</th>
                                    <th className="py-2 font-medium text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="group hover:bg-orange-50/60 dark:hover:bg-orange-900/10 cursor-pointer transition-colors">
                                    <td className="py-2 text-[11px] text-[var(--text-muted)]">Feb 28, 2026 · 9:14 AM CAT</td>
                                    <td className="py-2">
                                      <Link to="/track/ORD-1002" className="text-xs font-semibold" style={{ color: PRIMARY }}>
                                        ORD-1002
                                      </Link>
                                    </td>
                                    <td className="py-2">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                                        PAYMENT
                                      </span>
                                    </td>
                                    <td className="py-2 text-xs text-[var(--text-secondary)]">Visa •••• 4242</td>
                                    <td className="py-2 text-right text-xs font-semibold text-[var(--text-primary)]">$29.00</td>
                                    <td className="py-2 text-right text-[11px] text-[var(--text-muted)]">- $1.86</td>
                                    <td className="py-2 text-right text-xs font-semibold text-green-600 dark:text-green-400">$27.14</td>
                                    <td className="py-2 text-right">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                                        ESCROW_HOLD
                                      </span>
                                    </td>
                                  </tr>
                                  <tr className="group hover:bg-orange-50/60 dark:hover:bg-orange-900/10 cursor-pointer transition-colors">
                                    <td className="py-2 text-[11px] text-[var(--text-muted)]">Feb 20, 2026 · 4:02 PM CAT</td>
                                    <td className="py-2">
                                      <span className="text-xs font-semibold" style={{ color: PRIMARY }}>ORD-0998</span>
                                    </td>
                                    <td className="py-2">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                        RELEASED
                                      </span>
                                    </td>
                                    <td className="py-2 text-xs text-[var(--text-secondary)]">MTN MoMo ••• 3123</td>
                                    <td className="py-2 text-right text-xs font-semibold text-[var(--text-primary)]">$58.00</td>
                                    <td className="py-2 text-right text-[11px] text-[var(--text-muted)]">- $3.48</td>
                                    <td className="py-2 text-right text-xs font-semibold text-green-600 dark:text-green-400">$54.52</td>
                                    <td className="py-2 text-right">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                        SUCCESS
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile transaction cards */}
                            <div className="md:hidden space-y-3">
                              {[
                                {
                                  date: 'Feb 28, 2026 · 9:14 AM CAT',
                                  order: 'ORD-1002',
                                  type: 'PAYMENT / ESCROW_HOLD',
                                  method: 'Visa •••• 4242',
                                  amount: '$29.00',
                                  fee: '$1.86',
                                  net: '$27.14',
                                  status: 'In Escrow',
                                },
                              ].map((tx) => (
                                <div key={tx.order} className="rounded-2xl border border-\[var\(--divider\)\] p-3 bg-\[var\(--card-bg\)\] hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-colors">
                                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                    <span>{tx.date}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                                      In Escrow
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-xs">
                                    <div>
                                      <p className="font-semibold" style={{ color: PRIMARY }}>{tx.order}</p>
                                      <p className="text-[11px] text-[var(--text-muted)]">{tx.method}</p>
                                    </div>
                                    <p className="font-semibold text-[var(--text-primary)]">{tx.amount}</p>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                    <span>Fee: {tx.fee}</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">Net: {tx.net}</span>
                                  </div>
                                  <button type="button" className="mt-2 text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: PRIMARY }}>
                                    Download Receipt
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Summary row */}
                            <div className="pt-2 border-t border-\[var\(--divider\)\] text-[11px] text-[var(--text-muted)]">
                              Total transactions: 2 · Total spent: $227.49 · Total fees: $11.37 · Net: $216.12
                            </div>
                          </Card>

                          {/* Escrow protection info */}
                          <div className="rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-emerald-500 transition-colors duration-300">
                            <div>
                              <p className="font-bold text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                                🛡️ How Reaglex Escrow Works
                              </p>
                              <div className="mt-3 flex items-center flex-wrap gap-2 text-xs">
                                {[
                                  '💳 You Pay',
                                  '🔒 We Hold',
                                  '📦 Delivered',
                                  '✅ You Confirm',
                                  '💰 Seller Paid',
                                ].map((step, idx, arr) => (
                                  <div key={step} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] bg-\[var\(--card-bg\)\] text-green-600 dark:text-green-400">
                                      {step.split(' ')[0]}
                                    </div>
                                    <span className="text-[11px] font-medium text-green-800 dark:text-green-300">{step.split(' ').slice(1).join(' ')}</span>
                                    {idx < arr.length - 1 && (
                                      <div className="w-8 h-px bg-gradient-to-r from-orange-400 to-orange-500 rounded-full" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              {[
                                'Your money is never sent directly to the seller.',
                                "Full refund if the item doesn't arrive or is not as described.",
                                'Funds auto-release after 3 days if no issue is reported.',
                              ].map((text) => (
                                <div key={text} className="flex items-start gap-2">
                                  <span className="mt-[2px] text-green-600">✅</span>
                                  <p className="text-xs text-green-800 dark:text-green-300">{text}</p>
                                </div>
                              ))}
                              <p className="text-[11px] mt-2 text-green-600 dark:text-green-400">
                                Powered by Flutterwave · 256-bit SSL · PCI DSS Compliant
                              </p>
                            </div>
                          </div>

                          {/* Fee breakdown card */}
                          <Card className="p-5 space-y-3">
                            <p className="font-semibold text-sm flex items-center gap-2 text-[var(--text-primary)]">
                              💰 Fee Structure
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Estimate how much your seller receives for a given order total.</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                              <span>If you order</span>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-xs text-gray-400">$</span>
                                <input
                                  type="number"
                                  min="1"
                                  defaultValue={100}
                                  className="pl-5 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] text-xs w-28 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                                />
                              </div>
                              <span>worth of products:</span>
                            </div>
                            <div className="mt-2 text-xs space-y-1 text-[var(--text-muted)]">
                              <div className="flex justify-between">
                                <span>Order total</span>
                                <span>$100.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Reaglex fee (5%)</span>
                                <span>- $5.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Processing fee (1.4%)</span>
                                <span>- $1.40</span>
                              </div>
                              <div className="flex justify-between font-semibold text-[var(--text-primary)]">
                                <span>Seller receives</span>
                                <span>$93.60</span>
                              </div>
                              <div className="flex justify-between text-[11px] pt-1 border-t border-\[var\(--divider\)\] text-[var(--text-muted)]">
                                <span>You pay</span>
                                <span>$100.00</span>
                              </div>
                            </div>
                            <p className="text-[11px] mt-2 text-[var(--text-muted)]">
                              As a buyer, you only pay the order total. Fees are deducted from the seller payout.
                            </p>
                          </Card>

                          {/* Security center card */}
                          <div className="rounded-2xl p-5 space-y-3 bg-gray-900 dark:bg-gray-950 transition-colors duration-300">
                            <p className="font-bold text-base flex items-center gap-2 text-white">
                              🔐 Your Payment Security
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                              {[
                                { icon: '🔒', title: '256-bit SSL', desc: 'All traffic is encrypted end-to-end.' },
                                { icon: '✅', title: 'PCI DSS', desc: 'Compliant payment processing via Flutterwave.' },
                                { icon: '🛡️', title: 'Escrow', desc: 'Funds held until you confirm delivery.' },
                                { icon: '🔍', title: 'Fraud Detection', desc: 'Automated checks on risky payments.' },
                              ].map((f) => (
                                <div key={f.title} className="flex flex-col gap-1">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-500/20">
                                    <span>{f.icon}</span>
                                  </div>
                                  <p className="font-semibold text-white">{f.title}</p>
                                  <p className="text-[11px] text-gray-400">{f.desc}</p>
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              All payment data is encrypted. We never store your full card details.
                            </p>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                            >
                              🔒 View Security Policy
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Right sidebar (hidden on small screens) */}
                        <div className="hidden xl:flex flex-col gap-4">
                          <Card className="p-5 space-y-3">
                            <p className="font-semibold text-sm text-[var(--text-primary)]">Quick Stats</p>
                            <div className="space-y-2 text-xs text-[var(--text-muted)]">
                              <div className="flex justify-between">
                                <span>Total orders paid</span>
                                <span className="font-semibold text-[var(--text-primary)]">4</span>
                              </div>
                              <div className="flex justify-between">
                                <span>In escrow now</span>
                                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                                  $29.00 <span>🔒</span>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg order value</span>
                                <span className="font-semibold text-[var(--text-primary)]">$56.87</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Preferred method</span>
                                <span className="font-semibold text-[var(--text-primary)]">MTN MoMo</span>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-5 space-y-3">
                            <p className="font-semibold text-sm text-[var(--text-primary)]">Quick Actions</p>
                            <div className="flex flex-col gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setAddMethodOpen(true)}
                                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-white"
                                style={{ background: PRIMARY }}
                              >
                                + Add Payment Method
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-600 text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                📊 Download Statement
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-600 text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                🔒 View Escrow Orders
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-\[var\(--bg-tertiary\)\] text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                📞 Payment Support
                              </button>
                            </div>
                          </Card>

                          <Card className="p-5 space-y-3">
                            <p className="font-semibold text-sm text-[var(--text-primary)]">Need Help?</p>
                            <p className="text-xs text-[var(--text-muted)]">Having a payment issue? Our support team is here to help.</p>
                            <div className="flex flex-col gap-2 text-xs">
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 rounded-xl font-semibold text-white"
                                style={{ background: PRIMARY }}
                              >
                                💬 Chat Support
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 rounded-xl font-semibold border border-gray-200 dark:border-gray-600 text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                📧 Email Support
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 rounded-xl font-semibold bg-\[var\(--bg-tertiary\)\] text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                📞 Call: +250 xxx xxx
                              </button>
                              <p className="text-[11px] text-[var(--text-faint)]">Available Mon–Fri · 8am–6pm CAT</p>
                            </div>
                          </Card>
                        </div>
                      </div>

                      {/* Add Payment Method Modal */}
                      <AnimatePresence>
                        {addMethodOpen && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 flex items-center justify-center p-4"
                            style={{ background: 'rgba(15,23,42,0.45)' }}
                            onClick={() => setAddMethodOpen(false)}
                          >
                            <motion.div
                              initial={{ opacity: 0, y: 20, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 20, scale: 0.96 }}
                              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                              className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-\[var\(--card-bg\)\] p-5 transition-colors duration-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-bold text-base text-[var(--text-primary)]">Add Payment Method</p>
                                  <p className="text-xs mt-0.5 text-[var(--text-muted)]">Connect a card, mobile money wallet, PayPal or bank account.</p>
                                </div>
                                <button type="button" onClick={() => setAddMethodOpen(false)}>
                                  <X className="w-4 h-4 text-[var(--text-faint)]" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                                {[
                                  { id: 'card', label: 'Card', icon: '💳' },
                                  { id: 'mobile', label: 'Mobile Money', icon: '📱' },
                                  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                                  { id: 'bank', label: 'Bank', icon: '🏦' },
                                ].map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setAddMethodType(t.id)}
                                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-colors ${
                                      addMethodType === t.id
                                        ? 'text-white border-transparent'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                    style={addMethodType === t.id ? { background: PRIMARY } : {}}
                                  >
                                    <span>{t.icon}</span>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                              {/* Body per payment type (simplified UI only) */}
                              {addMethodType === 'card' && (
                                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] gap-5">
                                  <div>
                                    <p className="font-semibold text-xs mb-2 text-[var(--text-primary)]">Live Card Preview</p>
                                    <div
                                      className="rounded-2xl h-[150px] flex flex-col justify-between px-5 py-4 text-white text-xs shadow-lg"
                                      style={{ background: 'linear-gradient(135deg,#0f172a,#1f2937)' }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">Reaglex Secure</span>
                                        <span className="font-black text-lg tracking-[0.25em]">VISA</span>
                                      </div>
                                      <div>
                                        <p className="font-mono tracking-[0.3em] text-sm mb-3">•••• •••• •••• 4242</p>
                                        <div className="flex items-center justify-between text-[10px] opacity-85">
                                          <span>Cardholder Name</span>
                                          <span>MM/YY</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-3 text-xs">
                                    <div>
                                      <label className="block mb-1 font-medium text-[var(--text-secondary)]">Card Number</label>
                                      <input type="text" placeholder="•••• •••• •••• ••••" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors" />
                                    </div>
                                    <div>
                                      <label className="block mb-1 font-medium text-[var(--text-secondary)]">Cardholder Name</label>
                                      <input type="text" placeholder="As shown on card" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block mb-1 font-medium text-[var(--text-secondary)]">Expiry (MM/YY)</label>
                                        <input type="text" placeholder="12/27" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors" />
                                      </div>
                                      <div>
                                        <label className="block mb-1 font-medium flex items-center justify-between text-[var(--text-secondary)]">CVV</label>
                                        <input type="password" placeholder="•••" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {addMethodType === 'mobile' && (
                                <div className="space-y-3 text-xs">
                                  <p className="font-semibold text-[var(--text-primary)]">Mobile Money (Rwanda)</p>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-400 text-gray-800">MTN MoMo</button>
                                    <button
                                      type="button"
                                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                                    >
                                      Airtel 🔴
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block mb-1 font-medium text-[var(--text-secondary)]">Phone Number</label>
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-\[var\(--bg-secondary\)\] text-[var(--text-secondary)] text-xs">🇷🇼 +250</span>
                                      <input
                                        type="tel"
                                        placeholder="788 000 000"
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-[var(--text-secondary)]">Verify with OTP</p>
                                      <p className="text-[11px] text-[var(--text-muted)]">We’ll send a 6-digit code via SMS.</p>
                                    </div>
                                    <button
                                      type="button"
                                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                                      style={{ background: PRIMARY }}
                                    >
                                      Send OTP
                                    </button>
                                  </div>
                                </div>
                              )}
                              {addMethodType === 'paypal' && (
                                <div className="space-y-3 text-xs">
                                  <p className="font-semibold text-[var(--text-primary)]">Connect PayPal</p>
                                  <div>
                                    <label className="block mb-1 font-medium text-[var(--text-secondary)]">PayPal Email</label>
                                    <input
                                      type="email"
                                      placeholder="you@example.com"
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                  >
                                    🅿️ Connect PayPal
                                  </button>
                                </div>
                              )}
                              {addMethodType === 'bank' && (
                                <div className="space-y-3 text-xs">
                                  <p className="font-semibold text-[var(--text-primary)]">Bank Account</p>
                                  <div>
                                    <label className="block mb-1 font-medium text-[var(--text-secondary)]">Bank Name</label>
                                    <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors">
                                      <option>Choose a bank</option>
                                      <option>Bank of Kigali</option>
                                      <option>I&M Bank</option>
                                      <option>Equity Bank</option>
                                    </select>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block mb-1 font-medium text-[var(--text-secondary)]">Account Number</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                                      />
                                    </div>
                                    <div>
                                      <label className="block mb-1 font-medium text-[var(--text-secondary)]">Account Holder Name</label>
                                      <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" className="w-4 h-4 rounded border" style={{ accentColor: PRIMARY }} />
                                  <span className="font-medium text-[var(--text-secondary)]">Set as default</span>
                                </label>
                                <p className="text-[11px] text-[var(--text-muted)]">🔒 Encrypted & secure. We never store full card numbers.</p>
                              </div>
                              <div className="mt-4 flex gap-3 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setAddMethodOpen(false)}
                                  className="flex-1 py-2.5 rounded-xl font-semibold border border-gray-200 dark:border-gray-600 text-[var(--text-secondary)] bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 py-2.5 rounded-xl font-semibold text-white"
                                  style={{ background: PRIMARY }}
                                >
                                  Add Method →
                                </button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── MY REVIEWS ── */}
                  {tab === 'reviews' && (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                        <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>My Reviews</h2>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--divider-strong)' }}>
                            {['all', '5', '4', '3', '2', '1'].map((v) => (
                              <button key={v} type="button" onClick={() => setReviewsFilter(v)} className="px-3 py-2 text-xs font-medium" style={{ background: reviewsFilter === v ? PRIMARY : 'var(--card-bg)', color: reviewsFilter === v ? 'white' : 'var(--text-muted)' }}>{v === 'all' ? 'All' : `${v}★`}</button>
                            ))}
                          </div>
                          <select value={reviewsSort} onChange={(e) => setReviewsSort(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}>
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="rating">Highest rated</option>
                          </select>
                        </div>
                      </div>
                      <Card className="py-12">
                        <EmptyState icon={Star} title="No reviews yet" sub="After your order is delivered, you'll be able to leave a review here." />
                      </Card>
                    </div>
                  )}

                  {/* ── RETURNS & REFUNDS ── */}
                  {tab === 'returns' && (
                    <div className="space-y-5">
                      {/* Header banner */}
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="rounded-[20px] px-6 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                        style={{
                          background:
                            'linear-gradient(135deg,#1a0f3a 0%,#0d1f3a 50%,#111420 100%)',
                          boxShadow: '0 18px 45px rgba(0,0,0,0.55)',
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                            style={{
                              background: 'rgba(249,115,22,0.15)',
                              color: '#f97316',
                            }}
                          >
                            ↩
                          </div>
                          <div className="space-y-1">
                            <h2
                              className="text-[24px] md:text-[26px] font-bold"
                              style={{ color: '#ffffff' }}
                            >
                              Returns & Refunds
                            </h2>
                            <p
                              className="text-sm"
                              style={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                              Hassle-free returns within 30 days.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            '↩ 30-Day Returns',
                            '💰 Full Refunds',
                            '🛡️ Buyer Protected',
                          ].map((pill) => (
                            <div
                              key={pill}
                              className="px-4 py-1.5 rounded-full text-[12px] font-medium"
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.85)',
                                backdropFilter: 'blur(10px)',
                              }}
                            >
                              {pill}
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Stats row */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.05 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                      >
                        {[
                          {
                            label: 'Total Returns',
                            value: returns.length,
                            color: PRIMARY,
                            icon: '↩',
                          },
                          {
                            label: 'Pending Review',
                            value: returns.filter((r) =>
                              ['PENDING', 'UNDER_REVIEW'].includes(r.status)
                            ).length,
                            color: '#fbbf24',
                            icon: '⏳',
                          },
                          {
                            label: 'Approved',
                            value: returns.filter((r) =>
                              ['APPROVED', 'REFUNDED'].includes(r.status)
                            ).length,
                            color: '#34d399',
                            icon: '✓',
                          },
                          {
                            label: 'Total Refunded',
                            value: `$${returns
                              .filter((r) => r.status === 'REFUNDED')
                              .reduce((sum, r) => sum + (r.refundAmount || 0), 0)
                              .toFixed(2)}`,
                            color: '#60a5fa',
                            icon: '💰',
                          },
                        ].map((stat, idx) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 + idx * 0.04 }}
                            className="rounded-[16px] px-5 py-4"
                            style={{
                              background: 'var(--card-bg)',
                              boxShadow:
                                '0 10px 28px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                                  style={{
                                    background: 'rgba(249,115,22,0.08)',
                                    color: stat.color,
                                  }}
                                >
                                  {stat.icon}
                                </div>
                                <div>
                                  <p
                                    className="text-xs font-medium uppercase tracking-wide"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {stat.label}
                                  </p>
                                  <p
                                    className="text-lg font-bold mt-0.5"
                                    style={{ color: stat.color }}
                                  >
                                    {stat.label === 'Total Refunded'
                                      ? stat.value
                                      : String(stat.value)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* Filters & actions */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                          {RETURN_FILTERS.map((f) => {
                            const isActive = returnsFilter === f.id;
                            const count =
                              f.id === 'all'
                                ? returns.length
                                : filteredReturns.filter((r) => {
                                    if (f.id === 'pending') {
                                      return ['PENDING', 'UNDER_REVIEW'].includes(
                                        r.status
                                      );
                                    }
                                    if (f.id === 'approved') {
                                      return ['APPROVED', 'REFUNDED'].includes(
                                        r.status
                                      );
                                    }
                                    if (f.id === 'rejected') return r.status === 'REJECTED';
                                    if (f.id === 'completed')
                                      return r.status === 'COMPLETED';
                                    return true;
                                  }).length;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setReturnsFilter(f.id)}
                                className="inline-flex items-center gap-2 rounded-full text-xs font-medium px-4 py-1.5 transition-all"
                                style={{
                                  background: isActive ? PRIMARY : 'transparent',
                                  color: isActive
                                    ? '#ffffff'
                                    : 'var(--text-muted)',
                                  boxShadow: isActive
                                    ? '0 0 0 1px rgba(251,146,60,0.4),0 8px 20px rgba(249,115,22,0.4)'
                                    : 'none',
                                }}
                              >
                                <span>{f.label}</span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{
                                    background: isActive
                                      ? 'rgba(0,0,0,0.15)'
                                      : 'var(--bg-tertiary)',
                                    color: isActive
                                      ? '#ffffff'
                                      : 'var(--text-muted)',
                                  }}
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="relative w-full md:w-[220px]">
                            <Search
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                              style={{ color: 'var(--text-muted)' }}
                            />
                            <input
                              type="text"
                              value={returnsSearch}
                              onChange={(e) => setReturnsSearch(e.target.value)}
                              placeholder="Search by order ID..."
                              className="w-full h-10 pl-9 pr-3 rounded-[10px] text-xs outline-none"
                              style={{
                                background: 'var(--bg-secondary)',
                                boxShadow:
                                  '0 0 0 1px rgba(148,163,184,0.35), 0 6px 18px rgba(15,23,42,0.35)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewReturnOpen(true);
                              setNewReturnStep(1);
                            }}
                            className="inline-flex items-center gap-2 rounded-[12px] text-xs font-semibold px-4 py-2 text-white whitespace-nowrap"
                            style={{
                              background:
                                'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                              boxShadow:
                                '0 8px 24px rgba(249,115,22,0.45),0 2px 8px rgba(249,115,22,0.25)',
                            }}
                          >
                            <span className="text-base leading-none">+</span>
                            <span>New Return Request</span>
                          </button>
                        </div>
                      </div>

                      {/* Returns list / empty state */}
                      {filteredReturns.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35 }}
                          className="rounded-[20px] px-8 py-12 text-center"
                          style={{
                            background: 'var(--card-bg)',
                            boxShadow: '0 16px 40px rgba(15,23,42,0.45)',
                          }}
                        >
                          <motion.div
                            initial={{ scale: 0.9, y: 8, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 220 }}
                            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6"
                            style={{
                              background: 'rgba(249,115,22,0.1)',
                              boxShadow:
                                '0 18px 45px rgba(15,23,42,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                            }}
                          >
                            <span className="text-4xl">↩</span>
                          </motion.div>
                          <h3
                            className="text-[22px] font-bold mb-2"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            No returns yet
                          </h3>
                          <p
                            className="text-sm max-w-md mx-auto mb-6"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            All your return requests will appear here. Shop with
                            confidence — we&apos;ve got you covered.
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                            <Link to="/">
                              <button
                                type="button"
                                className="px-5 py-2.5 rounded-[12px] text-sm font-semibold text-white"
                                style={{
                                  background:
                                    'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                                  boxShadow:
                                    '0 10px 30px rgba(249,115,22,0.5)',
                                }}
                              >
                                Browse Products
                              </button>
                            </Link>
                            <button
                              type="button"
                              className="px-5 py-2.5 rounded-[12px] text-sm font-semibold"
                              style={{
                                background: 'transparent',
                                boxShadow: '0 0 0 1.5px var(--divider)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Learn about returns
                            </button>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {['30 days', 'Free returns', 'Quick refunds'].map(
                              (chip) => (
                                <span
                                  key={chip}
                                  className="px-3 py-1 rounded-full text-[11px] font-medium"
                                  style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {chip}
                                </span>
                              )
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-3"
                        >
                          {filteredReturns.map((ret, idx) => {
                            const meta = RETURN_STATUS_META[ret.status] || {
                              label: ret.status,
                              bg: '#e5e7eb',
                              color: '#4b5563',
                            };
                            return (
                              <motion.div
                                key={ret.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: 0.05 + idx * 0.03,
                                }}
                                whileHover={{
                                  y: -2,
                                  boxShadow:
                                    '0 14px 35px rgba(15,23,42,0.6)',
                                }}
                                className="rounded-[16px] px-5 py-4 cursor-pointer"
                                style={{
                                  background: 'var(--card-bg)',
                                  boxShadow:
                                    '0 10px 24px rgba(15,23,42,0.45)',
                                }}
                                onClick={() => {
                                  setActiveReturn(ret);
                                  setReturnDetailsOpen(true);
                                }}
                              >
                                {/* Top row */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <p
                                      className="text-xs font-semibold tracking-wide"
                                      style={{ color: PRIMARY }}
                                    >
                                      {ret.id}
                                    </p>
                                    <p
                                      className="text-xs mt-0.5"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      Order{' '}
                                      <span
                                        className="font-medium"
                                        style={{ color: 'var(--text-primary)' }}
                                      >
                                        #{ret.orderId}
                                      </span>{' '}
                                      · {ret.date}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {ret.status === 'REFUNDED' && ret.refundAmount && (
                                      <span
                                        className="text-xs font-medium px-2 py-1 rounded-full"
                                        style={{
                                          background: '#ecfdf5',
                                          color: '#16a34a',
                                        }}
                                      >
                                        ${ret.refundAmount.toFixed(2)} Refunded
                                      </span>
                                    )}
                                    <span
                                      className="px-3 py-1 rounded-full text-xs font-semibold"
                                      style={{
                                        background: meta.bg,
                                        color: meta.color,
                                      }}
                                    >
                                      {meta.label}
                                    </span>
                                  </div>
                                </div>

                                {/* Middle row */}
                                <div className="mt-4 flex items-start gap-4">
                                  <div className="w-14 h-14 rounded-[12px] overflow-hidden flex-shrink-0">
                                    <img
                                      src={ret.image}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap justify-between gap-2">
                                      <div className="min-w-0">
                                        <p
                                          className="text-sm font-semibold truncate"
                                          style={{ color: 'var(--text-primary)' }}
                                        >
                                          {ret.productName}
                                        </p>
                                        <p
                                          className="text-xs mt-0.5"
                                          style={{ color: 'var(--text-muted)' }}
                                        >
                                          {ret.variant} ·{' '}
                                          <span style={{ color: 'var(--text-faint)' }}>
                                            × {ret.quantity}
                                          </span>
                                        </p>
                                        {ret.reasonTag && (
                                          <span
                                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                            style={{
                                              background: 'var(--bg-tertiary)',
                                              color: 'var(--text-muted)',
                                            }}
                                          >
                                            {ret.reasonTag}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p
                                          className="text-sm font-bold"
                                          style={{ color: 'var(--text-primary)' }}
                                        >
                                          ${ret.price.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom row */}
                                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  {/* Timeline mini */}
                                  <div className="flex items-center gap-2 text-[11px]">
                                    {['submitted', 'review', 'decision', 'refunded'].map(
                                      (stepKey, index) => {
                                        const isCompleted =
                                          stepKey === 'submitted' ||
                                          (stepKey === 'review' &&
                                            ['UNDER_REVIEW', 'APPROVED', 'REFUNDED', 'COMPLETED'].includes(
                                              ret.status
                                            )) ||
                                          (stepKey === 'decision' &&
                                            ['APPROVED', 'REJECTED', 'REFUNDED', 'COMPLETED'].includes(
                                              ret.status
                                            )) ||
                                          (stepKey === 'refunded' &&
                                            ['REFUNDED', 'COMPLETED'].includes(
                                              ret.status
                                            ));
                                        const isCurrent =
                                          !isCompleted &&
                                          ((stepKey === 'review' &&
                                            ret.status === 'PENDING') ||
                                            (stepKey === 'decision' &&
                                              ['UNDER_REVIEW'].includes(ret.status)));
                                        return (
                                          <div
                                            key={stepKey}
                                            className="flex items-center gap-1"
                                          >
                                            <div
                                              className="w-2 h-2 rounded-full"
                                              style={{
                                                background: isCompleted
                                                  ? PRIMARY
                                                  : isCurrent
                                                  ? PRIMARY
                                                  : '#e5e7eb',
                                                boxShadow: isCurrent
                                                  ? '0 0 0 4px rgba(249,115,22,0.3)'
                                                  : 'none',
                                              }}
                                            />
                                            {index < 3 && (
                                              <div
                                                className="w-6 h-px rounded-full"
                                                style={{
                                                  background: isCompleted
                                                    ? 'rgba(249,115,22,0.7)'
                                                    : 'rgba(148,163,184,0.6)',
                                                }}
                                              />
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-wrap justify-end gap-2 text-xs">
                                    <button
                                      type="button"
                                      className="px-3 py-1.5 rounded-[10px] font-semibold"
                                      style={{
                                        background: 'transparent',
                                        boxShadow: '0 0 0 1px var(--divider)',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      View Details
                                    </button>
                                    {ret.status === 'PENDING' && (
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-[10px] font-semibold"
                                        style={{ color: '#dc2626' }}
                                      >
                                        Cancel Request
                                      </button>
                                    )}
                                    {ret.status === 'APPROVED' && (
                                      <>
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded-[10px] font-semibold"
                                          style={{
                                            background:
                                              'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                                            color: '#ffffff',
                                          }}
                                        >
                                          Track Refund
                                        </button>
                                      </>
                                    )}
                                    {ret.status === 'REJECTED' && (
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-[10px] font-semibold"
                                        style={{
                                          background:
                                            'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                                          color: '#ffffff',
                                        }}
                                      >
                                        Appeal Decision
                                      </button>
                                    )}
                                    {ret.status === 'COMPLETED' && (
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-[10px] font-semibold"
                                        style={{
                                          background: 'transparent',
                                          boxShadow: '0 0 0 1px var(--divider)',
                                          color: 'var(--text-secondary)',
                                        }}
                                      >
                                        Return Receipt
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}

                      {/* Return policy section */}
                      <ReturnsPolicySection />

                      {/* New Return Request modal & details panel are rendered at root */}
                    </div>
                  )}

                  {/* ── ACCOUNT SETTINGS (full dashboard with Profile / Security / Notifications / Preferences / Danger Zone) ── */}
                  {tab === 'settings' && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <AccountSettingsDashboard />
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

      {/* New Return Request modal */}
      <AnimatePresence>
        {newReturnOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[140] flex items-center justify-center px-4 py-8"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setNewReturnOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-xl rounded-[24px] overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{
                  background:
                    'linear-gradient(135deg,#1a0f3a 0%,#0d1f3a 50%,#111420 100%)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(249,115,22,0.18)',
                      color: '#f97316',
                    }}
                  >
                    ↩
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: '#ffffff' }}
                    >
                      New Return Request
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      Step {newReturnStep} of 3
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewReturnOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4 text-sm">
                {/* Step indicator */}
                <div className="flex items-center gap-3 text-[11px]">
                  {[
                    'Select Order',
                    'Return Details',
                    'Review & Submit',
                  ].map((label, idx) => {
                    const step = idx + 1;
                    const isActive = step === newReturnStep;
                    const isCompleted = step < newReturnStep;
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-1 flex-1 min-w-0"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                          style={{
                            background: isActive
                              ? PRIMARY
                              : isCompleted
                              ? 'rgba(34,197,94,0.15)'
                              : 'var(--bg-tertiary)',
                            color: isActive
                              ? '#ffffff'
                              : isCompleted
                              ? '#16a34a'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {step}
                        </div>
                        <span
                          className="truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {label}
                        </span>
                        {idx < 2 && (
                          <div
                            className="flex-1 h-px rounded-full ml-1"
                            style={{
                              background: isCompleted
                                ? 'rgba(34,197,94,0.6)'
                                : 'rgba(148,163,184,0.5)',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step content */}
                {newReturnStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Which order do you want to return?
                      </p>
                    </div>
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: 'var(--text-muted)' }}
                      />
                      <input
                        type="text"
                        value={newReturnOrderSearch}
                        onChange={(e) => setNewReturnOrderSearch(e.target.value)}
                        placeholder="Search orders by ID or product..."
                        className="w-full h-10 pl-9 pr-3 rounded-[10px] text-xs outline-none"
                        style={{
                          background: 'var(--bg-secondary)',
                          boxShadow:
                            '0 0 0 1px rgba(148,163,184,0.35), 0 6px 18px rgba(15,23,42,0.35)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {uiOrders.filter((o) => {
                        if (!newReturnOrderSearch) return true;
                        const q = newReturnOrderSearch.toLowerCase();
                        return (
                          o.id.toLowerCase().includes(q) ||
                          o.seller.toLowerCase().includes(q)
                        );
                      }).map((o) => {
                        const selected = newReturnSelectedOrderId === o.id;
                        const eligible = true;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setNewReturnSelectedOrderId(o.id)}
                            className="w-full flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left"
                            style={{
                              background: selected
                                ? 'rgba(249,115,22,0.08)'
                                : 'var(--card-bg)',
                              boxShadow: selected
                                ? '0 0 0 1px rgba(249,115,22,0.6)'
                                : '0 6px 18px rgba(15,23,42,0.35)',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded border flex items-center justify-center"
                                style={{
                                  borderColor: selected
                                    ? PRIMARY
                                    : 'var(--divider)',
                                  background: selected ? PRIMARY : 'transparent',
                                }}
                              >
                                {selected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div>
                                <p
                                  className="text-xs font-semibold"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {o.id}{' '}
                                  <span
                                    className="font-normal"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    · {o.date}
                                  </span>
                                </p>
                                <p
                                  className="text-[11px]"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {o.items} item(s) · ${o.total.toFixed(2)} ·{' '}
                                  {o.seller}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                eligible
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {eligible ? 'Eligible ✓' : 'Expired ✗'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {newReturnStep === 2 && (
                  <div className="space-y-4 text-sm">
                    <p
                      className="font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Tell us about the return
                    </p>
                    <div>
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Return reason *
                      </p>
                      <select
                        value={newReturnReason}
                        onChange={(e) => setNewReturnReason(e.target.value)}
                        className="w-full h-10 px-3 rounded-[10px] text-xs outline-none"
                        style={{
                          background: 'var(--bg-secondary)',
                          boxShadow:
                            '0 0 0 1px rgba(148,163,184,0.35), 0 4px 12px rgba(15,23,42,0.3)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="">Select...</option>
                        <option value="not_described">
                          📦 Item not as described
                        </option>
                        <option value="defective">
                          ❌ Defective or damaged
                        </option>
                        <option value="wrong_size">
                          📏 Wrong size / doesn&apos;t fit
                        </option>
                        <option value="wrong_item">
                          🚚 Wrong item received
                        </option>
                        <option value="changed_mind">
                          💔 Changed my mind
                        </option>
                        <option value="late">⏰ Arrived too late</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Condition of item
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {[
                          ['unopened', 'Unopened'],
                          ['opened', 'Opened'],
                          ['damaged', 'Damaged'],
                        ].map(([key, label]) => {
                          const active = newReturnCondition === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setNewReturnCondition(key)}
                              className="px-3 py-1.5 rounded-full font-semibold"
                              style={{
                                background: active
                                  ? 'rgba(249,115,22,0.1)'
                                  : 'var(--bg-tertiary)',
                                boxShadow: active
                                  ? '0 0 0 1px rgba(249,115,22,0.6)'
                                  : 'none',
                                color: active
                                  ? PRIMARY
                                  : 'var(--text-secondary)',
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Describe the issue
                        </p>
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {newReturnDescription.length}/500
                        </span>
                      </div>
                      <textarea
                        value={newReturnDescription}
                        onChange={(e) =>
                          setNewReturnDescription(
                            e.target.value.slice(0, 500)
                          )
                        }
                        rows={4}
                        placeholder="Describe the issue in detail..."
                        className="w-full px-3 py-2.5 rounded-[12px] text-xs outline-none resize-none"
                        style={{
                          background: 'var(--bg-secondary)',
                          boxShadow:
                            '0 0 0 1px rgba(148,163,184,0.35), 0 4px 12px rgba(15,23,42,0.3)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Photo evidence
                      </p>
                      <label
                        className="flex flex-col items-center justify-center gap-2 p-5 rounded-[16px] border-2 border-dashed cursor-pointer text-[11px]"
                        style={{
                          borderColor: 'var(--divider)',
                          background: 'var(--bg-secondary)',
                        }}
                      >
                        <Upload
                          className="w-5 h-5"
                          style={{ color: 'var(--text-muted)' }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>
                          📸 Drop photos here or click to upload
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--text-faint)' }}
                        >
                          Max 5 photos, 10MB each
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setNewReturnPhotos((prev) =>
                              [...prev, ...files].slice(0, 5)
                            );
                          }}
                        />
                      </label>
                      {newReturnPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {newReturnPhotos.map((f, idx) => (
                            <span
                              key={`${f.name}-${idx}`}
                              className="px-2 py-1 rounded-full text-[11px] font-medium"
                              style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              📎 {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Preferred resolution
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        {[
                          ['refund', '💰 Full Refund', 'Get your money back'],
                          ['exchange', '🔄 Exchange', 'Get a replacement item'],
                          ['credit', '🏪 Store Credit', 'Get credit + 10% bonus'],
                        ].map(([key, title, desc]) => {
                          const active = newReturnResolution === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setNewReturnResolution(key)}
                              className="text-left px-3 py-2 rounded-[12px]"
                              style={{
                                background: active
                                  ? 'rgba(249,115,22,0.08)'
                                  : 'var(--bg-tertiary)',
                                boxShadow: active
                                  ? '0 0 0 1px rgba(249,115,22,0.7)'
                                  : 'none',
                              }}
                            >
                              <p
                                className="font-semibold mb-0.5"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {title}
                              </p>
                              <p
                                className="text-[10px]"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {newReturnStep === 3 && (
                  <div className="space-y-4 text-sm">
                    <p
                      className="font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Review your request
                    </p>
                    <div
                      className="rounded-[14px] px-4 py-3 space-y-2"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Product & order
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Order: {newReturnSelectedOrderId || 'Not selected'} ·
                        Reason: {newReturnReason || 'Not specified'} · Condition:{' '}
                        {newReturnCondition}
                      </p>
                    </div>
                    <div
                      className="rounded-[14px] px-4 py-3"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Description
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {newReturnDescription || 'No additional details provided.'}
                      </p>
                    </div>
                    <div
                      className="rounded-[14px] px-4 py-3 flex items-center justify-between text-xs"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Preferred resolution
                        </p>
                        <p
                          className="mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {newReturnResolution === 'refund'
                            ? 'Full refund to original payment method.'
                            : newReturnResolution === 'exchange'
                            ? 'Replacement item of the same product.'
                            : 'Store credit with a small bonus.'}
                        </p>
                      </div>
                      <div
                        className="text-right text-xs font-semibold"
                        style={{ color: '#16a34a' }}
                      >
                        Est. refund: $29.00
                      </div>
                    </div>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Your request will be reviewed within 24-48 hours. The seller
                      will be notified and may contact you for more details.
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setNewReturnStep((s) => Math.max(1, s - 1))
                    }
                    disabled={newReturnStep === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-[10px] font-semibold disabled:opacity-40"
                    style={{
                      background: 'transparent',
                      boxShadow: '0 0 0 1px var(--divider)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newReturnStep < 3) {
                        setNewReturnStep((s) => s + 1);
                      } else {
                        showToast('Return request submitted (demo only).', 'success');
                        setNewReturnOpen(false);
                        setNewReturnStep(1);
                      }
                    }}
                    disabled={
                      (newReturnStep === 1 && !newReturnSelectedOrderId) ||
                      (newReturnStep === 2 && !newReturnReason)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] font-semibold text-white disabled:opacity-50"
                    style={{
                      background:
                        'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                      boxShadow:
                        '0 8px 24px rgba(249,115,22,0.45),0 2px 8px rgba(249,115,22,0.25)',
                    }}
                  >
                    {newReturnStep < 3 ? 'Next →' : 'Submit Return Request'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return details side panel */}
      <AnimatePresence>
        {returnDetailsOpen && activeReturn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[135] flex justify-end"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setReturnDetailsOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-md h-full shadow-2xl"
              style={{
                background: 'var(--card-bg)',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--divider-strong)]">
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Return {activeReturn.id}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Order #{activeReturn.orderId} · {activeReturn.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReturnDetailsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-full overflow-y-auto px-5 py-4 space-y-4 text-xs">
                {/* Timeline */}
                <div>
                  <p
                    className="text-[11px] font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Timeline
                  </p>
                  <div className="space-y-3">
                    {activeReturn.timeline.map((step, idx) => {
                      const completed =
                        idx === 0 ||
                        (idx === 1 &&
                          ['UNDER_REVIEW', 'APPROVED', 'REFUNDED', 'COMPLETED'].includes(
                            activeReturn.status
                          )) ||
                        (idx === 3 &&
                          ['APPROVED', 'REJECTED', 'REFUNDED', 'COMPLETED'].includes(
                            activeReturn.status
                          )) ||
                        (idx === 5 &&
                          ['REFUNDED', 'COMPLETED'].includes(
                            activeReturn.status
                          ));
                      const current =
                        !completed &&
                        idx === 1 &&
                        activeReturn.status === 'PENDING';
                      return (
                        <div key={step.key} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                              style={{
                                background: completed
                                  ? PRIMARY
                                  : current
                                  ? 'rgba(249,115,22,0.15)'
                                  : 'var(--bg-tertiary)',
                                color: completed
                                  ? '#ffffff'
                                  : current
                                  ? PRIMARY
                                  : 'var(--text-secondary)',
                              }}
                            >
                              {idx + 1}
                            </div>
                            {idx < activeReturn.timeline.length - 1 && (
                              <div
                                className="flex-1 w-px mt-1"
                                style={{
                                  background: completed
                                    ? 'rgba(249,115,22,0.7)'
                                    : 'rgba(148,163,184,0.5)',
                                }}
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {step.label}
                            </p>
                            {step.at && (
                              <p
                                className="text-[11px]"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {step.at}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Product details */}
                <div className="space-y-2">
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Product
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-[10px] overflow-hidden flex-shrink-0">
                      <img
                        src={activeReturn.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {activeReturn.productName}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {activeReturn.variant} · × {activeReturn.quantity}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Original price: ${activeReturn.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason & resolution */}
                <div className="space-y-2">
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Return reason
                  </p>
                  <p
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {activeReturn.reasonTag}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {activeReturn.reason}
                  </p>
                </div>

                <div className="space-y-1">
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Resolution
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {activeReturn.resolution} ·{' '}
                    {activeReturn.refundAmount
                      ? `$${activeReturn.refundAmount.toFixed(
                          2
                        )} estimated refund in 3-5 business days.`
                      : 'Estimated within 3-5 business days.'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* close position:relative z-1 wrapper */}
    </BuyerLayout>
  );
}
