import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Truck, Home, MapPin, ArrowLeft, FileText, Cog,
  Copy, Loader2, Search,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useToastStore } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { orderAPI } from '../services/api';
import { SERVER_URL } from '../lib/config';
import { formatOrderMoney } from '../lib/formatOrderMoney';

const PRIMARY = 'var(--brand-primary)';
const SUCCESS = 'var(--text-in-stock)';
const EASE = [0.25, 0.46, 0.45, 0.94];

const STATUS_STEP_INDEX = {
  pending: 0,
  processing: 1,
  packed: 1,
  paid: 1,
  shipped: 2,
  delivered: 4,
  completed: 4,
  cancelled: 0,
};

function resolveImg(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

function normalizeOrder(data) {
  const o = data?.order || data;
  if (!o) return null;
  const currency = o.currency || o.payment?.currency || 'RWF';
  return {
    ...o,
    id: o.id || o._id,
    order_number: o.order_number || o.orderNumber,
    status: String(o.status || 'processing').toLowerCase(),
    tracking_number: o.tracking_number || o.trackingNumber,
    can_confirm_receipt: o.can_confirm_receipt ?? o.canConfirmReceipt,
    payment_method: o.payment_method || o.paymentMethod,
    subtotal: o.subtotal,
    shipping: o.shipping,
    tax: o.tax,
    total: o.total,
    currency,
    items: o.items || [],
    timeline: o.timeline || [],
  };
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [progressWidth, setProgressWidth] = useState(0);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [guestMode, setGuestMode] = useState(!user && !orderId);
  const [guestForm, setGuestForm] = useState({ orderNumber: '', email: '', phone: '' });
  const [guestSearching, setGuestSearching] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setGuestMode(!user);
      return;
    }
    if (!user) {
      setGuestMode(true);
      setGuestForm((f) => ({ ...f, orderNumber: orderId }));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const data = await orderAPI.getById(orderId);
      setOrder(normalizeOrder(data));
      setGuestMode(false);
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Could not load order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const searchGuestOrder = async (e) => {
    e?.preventDefault();
    const num = guestForm.orderNumber.trim();
    const email = guestForm.email.trim();
    const phone = guestForm.phone.trim();
    if (!num || (!email && !phone)) {
      showToast('Enter order number and email or phone', 'error');
      return;
    }
    setGuestSearching(true);
    setLoadError(null);
    try {
      const data = await orderAPI.trackByNumber(num, { email: email || undefined, phone: phone || undefined });
      setOrder(normalizeOrder(data));
      setGuestMode(false);
      navigate(`/track/${encodeURIComponent(num)}`, { replace: true });
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Order not found. Check your details.');
      setOrder(null);
    } finally {
      setGuestSearching(false);
    }
  };

  const displayOrderId = order?.order_number || orderId || guestForm.orderNumber || '—';
  const status = String(order?.status || 'processing').toLowerCase();
  const isCod = String(order?.payment_method || '').toLowerCase().includes('cash');
  const isDelivered = status === 'delivered';
  const canConfirm = Boolean(order?.can_confirm_receipt) && user;
  const currentStepIndex = STATUS_STEP_INDEX[status] ?? 1;
  const trackingNumber = order?.tracking_number || '—';
  const mongoId = String(order?.id || orderId || '');

  const timelineSteps = useMemo(() => {
    const apiTimeline = Array.isArray(order?.timeline) ? order.timeline : [];
    const defaults = [
      { key: 'placed', label: 'Order placed', icon: FileText },
      { key: 'processing', label: 'Preparing', icon: Cog },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'out', label: 'On the way', icon: MapPin },
      { key: 'delivered', label: isCod ? 'Delivered — pay cash' : 'Delivered', icon: Home },
    ];
    const statusOrder = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
    const currentIdx = statusOrder.indexOf(status);

    return defaults.map((step, idx) => {
      const match = apiTimeline.find((t) =>
        String(t.status || '').toLowerCase().includes(step.key === 'out' ? 'ship' : step.key),
      );
      const done = idx <= Math.max(currentIdx, currentStepIndex);
      const active = idx === currentStepIndex;
      return {
        ...step,
        date: match?.date
          ? new Date(match.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : active
            ? 'In progress'
            : '—',
        done,
        active,
        sub:
          step.key === 'delivered' && isCod
            ? 'Have exact cash ready for the driver.'
            : step.key === 'delivered' && canConfirm
              ? 'Confirm receipt when you have your package.'
              : '',
      };
    });
  }, [order, status, currentStepIndex, canConfirm, isCod]);

  useEffect(() => {
    const duration = 1500;
    const start = Date.now();
    const steps = 5;
    const targetPercent = ((currentStepIndex + 1) / steps) * 100;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) ** 2;
      setProgressWidth(eased * targetPercent);
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(id);
  }, [currentStepIndex]);

  const copyTracking = () => {
    if (!trackingNumber || trackingNumber === '—') return;
    navigator.clipboard.writeText(trackingNumber);
    showToast('Tracking number copied', 'success', 2000);
  };

  const handleConfirmDelivery = async () => {
    const id = mongoId;
    try {
      setConfirmLoading(true);
      await orderAPI.confirmReceipt(id);
      setConfirmSuccess(true);
      showToast(isCod ? 'Delivery confirmed. Thank you!' : 'Delivery confirmed — seller notified.', 'success');
      await loadOrder();
      setTimeout(() => {
        setConfirmModal(false);
        setConfirmSuccess(false);
      }, 1800);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not confirm delivery', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const firstItem = order?.items?.[0];

  if (loading) {
    return (
      <BuyerLayout>
        <div className="min-h-[50vh] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
        </div>
      </BuyerLayout>
    );
  }

  if (guestMode && !order) {
    return (
      <BuyerLayout>
        <div className="max-w-md mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold mb-6" style={{ color: PRIMARY }}>
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Track your order</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Enter your order number and the email or phone used at checkout.
          </p>
          <form onSubmit={searchGuestOrder} className="space-y-4 rounded-2xl border p-5" style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}>
            <label className="block text-sm">
              Order number
              <input
                required
                value={guestForm.orderNumber}
                onChange={(e) => setGuestForm((f) => ({ ...f, orderNumber: e.target.value }))}
                placeholder="e.g. RX-20260326-001"
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
              />
            </label>
            <label className="block text-sm">
              Email (optional if phone provided)
              <input
                type="email"
                value={guestForm.email}
                onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
              />
            </label>
            <label className="block text-sm">
              Phone (optional if email provided)
              <input
                value={guestForm.phone}
                onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+250..."
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
              />
            </label>
            {loadError && <p className="text-sm text-red-600">{loadError}</p>}
            <button
              type="submit"
              disabled={guestSearching}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: PRIMARY }}
            >
              {guestSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track order
            </button>
          </form>
          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Have an account?{' '}
            <Link to="/auth?tab=login" className="font-semibold" style={{ color: PRIMARY }}>
              Sign in
            </Link>{' '}
            for full order history.
          </p>
        </div>
      </BuyerLayout>
    );
  }

  if (loadError || !order) {
    return (
      <BuyerLayout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4">
          <p style={{ color: 'var(--text-muted)' }}>{loadError || 'Order not found'}</p>
          <button type="button" onClick={() => { setGuestMode(true); setLoadError(null); }} className="text-sm font-semibold" style={{ color: PRIMARY }}>
            Try guest tracking
          </button>
          <Link to="/account?tab=orders" className="text-sm font-semibold" style={{ color: PRIMARY }}>
            ← My Orders
          </Link>
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div className="min-h-screen track-page" style={{ background: 'var(--bg-page)' }}>
        {/* ═══ TIER 1: Hero banner ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="w-full px-4 sm:px-8 py-6 flex items-center justify-between flex-wrap gap-4"
          style={{
            minHeight: 120,
            background: 'linear-gradient(135deg, var(--navbar-bg) 0%, var(--bg-tertiary) 55%, var(--brand-primary) 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div>
            <Link to={user ? '/account?tab=orders' : '/'} className="inline-flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <ArrowLeft className="w-4 h-4" /> {user ? 'My Orders' : 'Home'}
            </Link>
            <h1 className="text-2xl font-bold text-white">Track order</h1>
            <p className="text-sm mt-0.5" style={{ color: PRIMARY }}>#{displayOrderId}</p>
            {isCod && (
              <p className="text-xs mt-1 text-white/80">Cash on delivery — pay when you receive the package</p>
            )}
          </div>
          <div className="px-3 py-1.5 rounded-full text-sm font-bold capitalize" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            {status.replace(/_/g, ' ')}
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {firstItem && (
            <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}>
              {firstItem.product_image && (
                <img src={resolveImg(firstItem.product_image)} alt="" className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{firstItem.product_title || firstItem.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Qty {firstItem.quantity}
                </p>
              </div>
            </div>
          )}

          {Number(order?.total) > 0 && (
            <div className="rounded-2xl p-5 space-y-2" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-md)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                Payment summary
              </p>
              {order.subtotal != null && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatOrderMoney(order.subtotal, order.currency)}
                  </span>
                </div>
              )}
              {order.shipping != null && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span>Shipping</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatOrderMoney(order.shipping, order.currency)}
                  </span>
                </div>
              )}
              {order.tax != null && Number(order.tax) > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span>VAT</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatOrderMoney(order.tax, order.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t pt-2" style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ color: PRIMARY }}>{formatOrderMoney(order.total, order.currency)}</span>
              </div>
              {!isCod && String(order.payment_method || '').toLowerCase() !== 'cash_on_delivery' && (
                <p className="text-xs pt-1" style={{ color: 'var(--badge-success-text)' }}>
                  Paid online — funds held in escrow until you confirm delivery.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl p-5 bg-[var(--card-bg)]" style={{ boxShadow: 'var(--shadow-md)' }}>
            <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressWidth}%`, background: PRIMARY }} />
            </div>
            <div className="space-y-4">
              {timelineSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: step.done ? PRIMARY : 'var(--bg-tertiary)',
                        color: step.done ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{step.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{step.date}</p>
                      {step.sub && <p className="text-xs mt-0.5 text-emerald-700">{step.sub}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {trackingNumber && trackingNumber !== '—' && (
            <div className="rounded-2xl p-4 flex items-center justify-between gap-3" style={{ background: 'var(--card-bg)' }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Tracking number</p>
                <p className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{trackingNumber}</p>
              </div>
              <button type="button" onClick={copyTracking} className="p-2 rounded-lg border" style={{ borderColor: 'var(--divider)' }} aria-label="Copy tracking">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {user ? (
              <motion.button
                type="button"
                onClick={() => canConfirm && setConfirmModal(true)}
                disabled={!canConfirm || confirmLoading}
                whileTap={canConfirm ? { scale: 0.98 } : {}}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: canConfirm ? SUCCESS : 'var(--text-faint)' }}
              >
                {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {canConfirm ? 'I received my order' : isDelivered ? 'Already confirmed' : 'Confirm when delivered'}
              </motion.button>
            ) : (
              <Link
                to={`/auth?tab=login&redirect=${encodeURIComponent(`/track/${orderId || displayOrderId}`)}`}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-center text-white"
                style={{ background: PRIMARY }}
              >
                Sign in to confirm delivery
              </Link>
            )}
            {user && mongoId && (
              <Link
                to={`/returns?order=${mongoId}`}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-center border-2"
                style={{ borderColor: 'var(--badge-error-text)', color: 'var(--badge-error-text)' }}
              >
                Problem with this order?
              </Link>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => !confirmSuccess && !confirmLoading && setConfirmModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-2xl p-6 bg-[var(--card-bg)] shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {!confirmSuccess ? (
                <>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    Did you receive your order?
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    Order #{displayOrderId}
                    {isCod ? ' — you should have paid cash to the driver.' : ' — payment will be released to the seller.'}
                  </p>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      disabled={confirmLoading}
                      onClick={() => setConfirmModal(false)}
                      className="flex-1 py-3 rounded-xl font-semibold border-2"
                      style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}
                    >
                      Not yet
                    </button>
                    <button
                      type="button"
                      disabled={confirmLoading}
                      onClick={handleConfirmDelivery}
                      className="flex-1 py-3 rounded-xl font-semibold text-white"
                      style={{ background: PRIMARY }}
                    >
                      {confirmLoading ? 'Confirming…' : 'Yes, received'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: SUCCESS }}>
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Thank you!</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BuyerLayout>
  );
}
