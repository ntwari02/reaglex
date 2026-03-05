import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Truck, Home, MapPin, ArrowLeft, MessageSquare, FileText, Cog,
  Copy, Warehouse, ChevronRight, Download,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useToastStore } from '../stores/toastStore';

const PRIMARY = '#f97316';
const SUCCESS = '#10b981';
const EASE = [0.25, 0.46, 0.45, 0.94];

const PROGRESS_STEPS = [
  { id: 1, key: 'placed', label: 'Order Placed', icon: FileText },
  { id: 2, key: 'processing', label: 'Processing', icon: Cog },
  { id: 3, key: 'shipped', label: 'Shipped', icon: Truck },
  { id: 4, key: 'out', label: 'Out for Delivery', icon: MapPin },
  { id: 5, key: 'delivered', label: 'Delivered', icon: Home },
];

const TIMELINE_STEPS = [
  { id: 1, label: 'Order Placed', icon: FileText, date: 'Feb 28, 2026 · 9:14 AM', done: true, active: false, sub: 'We received your order and payment is in escrow.' },
  { id: 2, label: 'Processing', icon: Cog, date: 'Feb 28, 2026 · 11:30 AM', done: true, active: false, sub: 'Seller is preparing your order.' },
  { id: 3, label: 'Shipped', icon: Truck, date: 'Mar 1, 2026 · 2:00 PM', done: false, active: true, sub: 'Your order is on the way.', tracking: 'XK-8423-9912' },
  { id: 4, label: 'Out for Delivery', icon: MapPin, date: 'Expected Mar 5', done: false, active: false, sub: 'Almost there! Your order will arrive today.', expected: true },
  { id: 5, label: 'Delivered', icon: Home, date: 'Expected Mar 5', done: false, active: false, sub: 'Confirm delivery to release funds to the seller.', expected: true },
];

const ORDER_SUMMARY_ITEMS = [
  { name: 'Adidas Nova 3', variant: 'Size M · Black', qty: 1, price: 29, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80' },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const displayOrderId = orderId || 'ORD-1002';
  const showToast = useToastStore((s) => s.showToast);

  const [progressWidth, setProgressWidth] = useState(0);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifications, setNotifications] = useState({ sms: true, email: true, push: false });

  const currentStepIndex = 2; // Shipped = index 2 (0-based)

  useEffect(() => {
    const duration = 1500;
    const start = Date.now();
    const steps = 5;
    const targetPercent = ((currentStepIndex + 1) / steps) * 100;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setProgressWidth(eased * targetPercent);
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(id);
  }, [currentStepIndex]);

  const copyTracking = () => {
    navigator.clipboard.writeText('XK-8423-9912');
    showToast('Copied! ✓', 'success', 2000);
  };

  const handleConfirmDelivery = () => {
    setConfirmSuccess(true);
    showToast('Delivery confirmed. Thank you!', 'success');
    setTimeout(() => { setConfirmModal(false); setConfirmSuccess(false); }, 1800);
  };

  const isDelivered = false;

  return (
    <BuyerLayout>
      <div className="min-h-screen track-page" style={{ background: 'var(--bg-page)', fontFamily: 'Inter, sans-serif' }}>
        {/* ═══ TIER 1: Hero banner ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0 }}
          className="w-full px-4 sm:px-8 py-6 flex items-center justify-between flex-wrap gap-4"
          style={{
            minHeight: 120,
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 60%, #f97316 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div>
            <Link to="/account?tab=orders" className="inline-flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <ArrowLeft className="w-4 h-4" /> My Orders
            </Link>
            <h1 className="text-2xl font-bold text-white" style={{ fontSize: 28 }}>Track Order</h1>
            <p className="text-sm mt-0.5" style={{ color: PRIMARY }}>Order #{displayOrderId}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Home › My Orders › Track Order</p>
          </div>
          <div className="flex items-center gap-4">
            <motion.span className="text-4xl" animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>🚚</motion.span>
            <span
              className="px-4 py-2 rounded-full text-sm font-bold text-white track-pulse-ring"
              style={{ background: PRIMARY, boxShadow: '0 0 0 0 rgba(249,115,22,0.4)' }}
            >
              In Transit
            </span>
          </div>
        </motion.div>

        {/* ═══ TIER 2: 2-column layout ═══ */}
        <div className="w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6" style={{ paddingLeft: 'max(16px, 32px)', paddingRight: 'max(16px, 32px)' }}>
          {/* ═══ LEFT COLUMN (60%) ═══ */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="space-y-6"
          >
            {/* ═══ TIER 3: Delivery Progress card ═══ */}
            <div
              className="rounded-2xl p-6 bg-[var(--card-bg)] overflow-hidden track-card track-main-card"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <h2 className="font-bold text-base mb-6" style={{ color: '#111827' }}>Delivery Progress</h2>

              {/* Horizontal step progress bar - scrollable on small screens */}
              <div className="mb-8 relative overflow-x-auto scrollbar-hide">
                <div className="flex justify-between relative z-10 min-w-[320px]">
                  {PROGRESS_STEPS.map((step, i) => {
                    const completed = i < currentStepIndex;
                    const current = i === currentStepIndex;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 400 }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${current ? 'track-pulse-ring' : ''} track-step-circle`}
                          style={{
                            background: current || completed ? PRIMARY : 'var(--bg-tertiary)',
                            boxShadow: current
                              ? '0 0 16px rgba(249,115,22,0.50)'
                              : completed
                              ? '0 0 0 4px rgba(249,115,22,0.18)'
                              : 'none',
                          }}
                        >
                          {completed && !current ? <Check className="w-5 h-5 text-white" /> : null}
                          {current ? (
                            <Truck className="w-5 h-5 text-white" />
                          ) : !completed ? (
                            <Icon className="w-5 h-5" style={{ color: 'var(--text-faint)' }} />
                          ) : null}
                        </motion.div>
                        <span
                          className="text-[10px] mt-2 text-center font-medium max-w-[70px]"
                          style={{
                            color: current
                              ? 'var(--text-primary)'
                              : completed
                              ? 'var(--text-muted)'
                              : 'var(--text-faint)',
                            fontWeight: current ? 600 : 500,
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="absolute top-5 left-0 right-0 h-0.5 rounded"
                  style={{ marginLeft: '5%', marginRight: '5%', width: '90%', background: 'var(--divider)' }}
                />
                <motion.div
                  className="absolute top-5 left-0 h-0.5 rounded"
                  style={{ background: PRIMARY, left: '5%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressWidth * 0.9}%` }}
                  transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>

              {/* Vertical timeline */}
              <div className="relative">
                <div
                  className="absolute left-6 top-0 bottom-0 w-0.5"
                  style={{ borderRadius: 2, background: 'var(--divider)' }}
                />
                {TIMELINE_STEPS.map((step, i) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.4, ease: EASE }}
                    className={`flex gap-4 pb-8 last:pb-0 relative timeline-row ${
                      step.active ? 'timeline-row-current' : step.done ? 'timeline-row-completed' : 'timeline-row-pending'
                    }`}
                  >
                    <div
                      className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center timeline-icon"
                      style={{
                        background: step.done || step.active ? PRIMARY : 'var(--bg-tertiary)',
                        boxShadow: step.active
                          ? '0 0 20px rgba(249,115,22,0.50)'
                          : step.done
                          ? '0 0 12px rgba(249,115,22,0.35)'
                          : 'none',
                      }}
                    >
                      {step.done ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <step.icon
                          className="w-6 h-6"
                          style={{ color: step.active || step.done ? '#ffffff' : 'var(--text-faint)' }}
                        />
                      )}
                    </div>
                    <div className="pt-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="font-bold text-sm"
                            style={{
                              color: step.done || step.active ? 'var(--text-primary)' : 'var(--text-muted)',
                              fontSize: 15,
                            }}
                          >
                            {step.label}
                          </p>
                          {step.active && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                              style={{ background: PRIMARY }}
                            >
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-faint)', fontStyle: step.expected ? 'italic' : 'normal' }}
                        >
                          {step.date}
                        </p>
                      </div>
                      {(step.done || step.active) && step.sub && (
                        <p
                          className="text-sm mt-1"
                          style={{
                            color: step.active ? 'var(--text-secondary)' : 'var(--text-muted)',
                            fontSize: 13,
                          }}
                        >
                          {step.sub}
                        </p>
                      )}
                      {step.tracking && (
                        <button type="button" onClick={copyTracking} className="inline-flex items-center gap-1 mt-2 text-sm font-medium hover:underline" style={{ color: PRIMARY }}>
                          Tracking: {step.tracking} <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ═══ TIER 4: Live map section ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4, ease: EASE }}
              className="rounded-2xl overflow-hidden bg-[var(--card-bg)] relative track-card"
              style={{ boxShadow: 'var(--shadow-md)', minHeight: 200 }}
            >
              <div className="p-4 relative h-[160px] sm:h-[180px] md:h-[200px]">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <line
                    x1="10%"
                    y1="50%"
                    x2="90%"
                    y2="50%"
                    stroke="var(--divider)"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                  />
                  <line x1="10%" y1="50%" x2="60%" y2="50%" stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shadow-lg">
                  <Warehouse className="w-5 h-5 text-white" />
                </div>
                <div
                  className="absolute left-[60%] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--card-bg)] shadow-lg track-map-truck flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 20px rgba(249,115,22,0.50)',
                  }}
                >
                  <Truck className="w-6 h-6" style={{ color: PRIMARY }} />
                </div>
                <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
                  <Home className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="px-4 pb-4 border-t border-[var(--divider)] pt-3">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  📦 Your package is on its way from Kigali → Delivery Address
                </p>
                <p className="text-sm font-bold mt-1" style={{ color: PRIMARY }}>
                  Estimated delivery: Mar 5, 2026
                </p>
              </div>
            </motion.div>
          </motion.div>

            {/* ═══ RIGHT COLUMN (40%) ═══ */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
            className="space-y-6"
          >
            {/* ═══ TIER 5: Order Summary card ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.4, ease: EASE }}
              className="rounded-2xl p-5 bg-[var(--card-bg)] track-card"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base" style={{ color: '#111827' }}>
                  Order Summary
                </h3>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'var(--brand-tint)',
                    color: 'var(--brand-primary)',
                    boxShadow: 'inset 0 0 0 1px var(--status-orange-ring)',
                  }}
                >
                  {displayOrderId}
                </span>
              </div>
              {ORDER_SUMMARY_ITEMS.map((item) => (
                <div key={item.name} className="flex gap-3 py-3 border-b border-[var(--divider)]">
                  <img
                    src={item.image}
                    alt=""
                    className="w-15 h-15 rounded-lg object-cover flex-shrink-0"
                    style={{ width: 60, height: 60, background: 'var(--bg-tertiary)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.variant}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {item.qty} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    ${(item.qty * item.price).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="space-y-2 pt-3 text-sm">
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>$29.00</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>Shipping</span>
                  <span className="text-green-600">Free ✓</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>Escrow Fee</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2">
                  <span style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ color: PRIMARY }}>$29.00</span>
                </div>
              </div>
              <Link to={`/account?tab=orders`} className="inline-flex items-center gap-1 mt-3 text-sm font-semibold" style={{ color: PRIMARY }}>View Full Order <ChevronRight className="w-4 h-4" /></Link>
            </motion.div>

            {/* Seller card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.4, ease: EASE }}
              className="rounded-2xl p-5 bg-[var(--card-bg)] transition-shadow hover:shadow-lg track-card"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>SELLER</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>P</div>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Premium Store
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ⭐ 4.9 · 247 sales
                  </p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#10b981' }}>🟢 Online Now</p>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Quality products with fast shipping.
              </p>
              <Link to="/search" className="inline-block mt-3 text-sm font-semibold" style={{ color: PRIMARY }}>Visit Store →</Link>
            </motion.div>

            {/* Shipping To */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.4, ease: EASE }}
              className="rounded-2xl p-5 bg-[var(--card-bg)] track-card"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>Shipping To</p>
              <div className="flex gap-2">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: PRIMARY }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    John Doe
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    123 Main Street, City, State 12345
                  </p>
                  <button type="button" className="text-xs mt-1 hover:underline" style={{ color: 'var(--text-muted)' }}>
                    Change Address
                  </button>
                  <p className="text-sm font-bold mt-2 flex items-center gap-1" style={{ color: SUCCESS }}>📅 Expected by March 5, 2026</p>
                </div>
              </div>
            </motion.div>

            {/* Escrow card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15, duration: 0.4, ease: EASE }}
              className="rounded-2xl p-5 border-l-4 flex gap-3"
              style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderLeftColor: SUCCESS }}
            >
              <motion.span className="text-2xl flex-shrink-0 track-lock-rock" style={{ display: 'inline-block' }}>🛡️</motion.span>
              <div>
                <p className="font-bold text-base" style={{ color: '#047857' }}>
                  Escrow Protection Active
                </p>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  Payment is held securely. Funds released when you confirm delivery.
                </p>
                <p className="text-xs font-semibold mt-3" style={{ color: '#374151' }}>
                  Funds released when: You confirm delivery
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 rounded-lg text-xs font-medium text-white" style={{ background: SUCCESS }}>Held ✓</span>
                  <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: '#e5e7eb', color: '#6b7280' }}>Delivered</span>
                  <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: '#e5e7eb', color: '#6b7280' }}>Released to Seller</span>
                </div>
              </div>
            </motion.div>

            {/* ═══ TIER 6: Action buttons ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.4, ease: EASE }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <motion.a href="https://www.dhl.com/track" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 min-w-0 sm:min-w-[140px] py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-shadow hover:shadow-lg" style={{ background: PRIMARY }}>
                  🚚 Track on Carrier
                </motion.a>
                <motion.button type="button" onClick={() => isDelivered && setConfirmModal(true)} disabled={!isDelivered} whileHover={isDelivered ? { scale: 1.02 } : {}} whileTap={isDelivered ? { scale: 0.98 } : {}} className="flex-1 min-w-0 sm:min-w-[140px] py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-lg" style={{ background: isDelivered ? SUCCESS : '#9ca3af' }}>
                  ✓ Confirm Delivery
                </motion.button>
                <motion.button type="button" onClick={() => setChatOpen(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 min-w-0 sm:min-w-[120px] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-[var(--card-bg)] border-2 transition-shadow hover:shadow-md" style={{ color: '#374151', borderColor: '#e5e7eb' }}>
                  <MessageSquare className="w-4 h-4" /> Message Seller
                </motion.button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link to="/returns" className="px-3 py-2 rounded-xl border-2 font-medium hover:scale-[1.02] transition-transform" style={{ borderColor: '#ef4444', color: '#ef4444' }}>Request Return</Link>
                <button type="button" className="px-3 py-2 rounded-xl border-2 border-gray-300 font-medium hover:scale-[1.02] transition-transform" style={{ color: '#6b7280' }}>Report Problem</button>
                <button type="button" className="px-3 py-2 rounded-xl border-2 border-gray-300 font-medium hover:scale-[1.02] transition-transform flex items-center gap-1" style={{ color: '#6b7280' }}><Download className="w-4 h-4" /> Download Invoice</button>
              </div>
            </motion.div>

            {/* ═══ TIER 7: Delivery Notifications ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25, duration: 0.4, ease: EASE }}
              className="rounded-2xl p-5 bg-[var(--card-bg)] track-card"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <h3 className="font-bold text-sm mb-4" style={{ color: '#111827' }}>
                Delivery Notifications
              </h3>
              {['sms', 'email', 'push'].map((key) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {key === 'sms'
                      ? 'SMS updates'
                      : key === 'email'
                      ? 'Email updates'
                      : 'Push notifications'}
                  </span>
                  <button type="button" onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))} className={`w-11 h-6 rounded-full transition-colors relative ${notifications[key] ? '' : 'bg-gray-300'}`} style={{ background: notifications[key] ? PRIMARY : undefined }}>
                    <motion.span layout className="absolute top-1 w-4 h-4 rounded-full bg-[var(--card-bg)] shadow" style={{ left: notifications[key] ? 22 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </button>
                </div>
              ))}
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Get notified at: reaglerobust2020@gmail.com{' '}
                <button type="button" className="underline ml-1" style={{ color: PRIMARY }}>
                  Edit
                </button>
              </p>
            </motion.div>

            {/* ═══ TIER 8: Need Help ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.4, ease: EASE }}
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: '#1e40af' }}>Need Help with this order?</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="px-3 py-2 rounded-full text-sm font-medium bg-[var(--card-bg)]/80 hover:bg-[var(--card-bg)] border border-blue-200 transition-colors" style={{ color: '#1e40af' }}>📦 Where&apos;s my package?</button>
                <button type="button" className="px-3 py-2 rounded-full text-sm font-medium bg-[var(--card-bg)]/80 hover:bg-[var(--card-bg)] border border-blue-200 transition-colors" style={{ color: '#1e40af' }}>🔄 How to return?</button>
                <button type="button" className="px-3 py-2 rounded-full text-sm font-medium bg-[var(--card-bg)]/80 hover:bg-[var(--card-bg)] border border-blue-200 transition-colors" style={{ color: '#1e40af' }}>💬 Contact Support</button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Confirm Delivery Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => !confirmSuccess && setConfirmModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, ease: EASE }} className="rounded-2xl p-6 bg-[var(--card-bg)] shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              {!confirmSuccess ? (
                <>
                  <p className="font-bold text-lg" style={{ color: '#111827' }}>Are you sure you received your order?</p>
                  <p className="text-sm mt-2" style={{ color: '#6b7280' }}>Once confirmed, payment is released to the seller.</p>
                  <div className="flex gap-3 mt-6">
                    <motion.button type="button" onClick={() => setConfirmModal(false)} className="flex-1 py-3 rounded-xl font-semibold border-2" style={{ borderColor: '#e5e7eb', color: '#374151' }}>Cancel</motion.button>
                    <motion.button type="button" onClick={handleConfirmDelivery} className="flex-1 py-3 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Yes, Confirm Receipt</motion.button>
                  </div>
                </>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: SUCCESS }}>
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                  <p className="font-bold text-lg" style={{ color: '#111827' }}>Delivery confirmed!</p>
                  <p className="text-sm" style={{ color: '#6b7280' }}>Payment has been released to the seller.</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat drawer placeholder - could link to /messages */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setChatOpen(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--card-bg)] shadow-2xl rounded-l-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg" style={{ color: '#111827' }}>Message Seller</h3>
                <button type="button" onClick={() => setChatOpen(false)} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">✕</button>
              </div>
              <p className="text-sm" style={{ color: '#6b7280' }}>Chat with Premium Store about your order.</p>
              <Link to="/messages" className="inline-block mt-4 px-4 py-2 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Open Messages</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BuyerLayout>
  );
}
