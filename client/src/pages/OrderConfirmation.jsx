import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Truck, Loader2 } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useTranslation } from '../i18n/useTranslation';
import { orderAPI } from '../services/api';
import { formatOrderMoney } from '../lib/formatOrderMoney';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function statusLabel(status, t) {
  const s = String(status || 'processing').toLowerCase();
  if (s === 'pending' || s === 'processing' || s === 'paid') return t('orderConfirmation.processing');
  if (s === 'shipped') return t('orderConfirmation.shipped', { defaultValue: 'Shipped' });
  if (s === 'delivered' || s === 'completed') return t('orderConfirmation.delivered', { defaultValue: 'Delivered' });
  return s;
}

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unpaidIds, setUnpaidIds] = useState([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('spacilly_unpaid_order_ids');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setUnpaidIds(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError(t('orderConfirmation.notFound', { defaultValue: 'Order not found.' }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await orderAPI.getById(orderId);
        if (cancelled) return;
        setOrder(res?.order || null);
        if (!res?.order) setError(t('orderConfirmation.notFound', { defaultValue: 'Order not found.' }));
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || t('orderConfirmation.loadFailed', { defaultValue: 'Could not load order details.' }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  const displayNumber = order?.order_number || order?.orderNumber || orderId;
  const deliveryDate = useMemo(
    () => formatDate(order?.estimated_delivery || order?.estimated_delivery_to),
    [order],
  );
  const itemCount = (order?.items || []).reduce((n, it) => n + (Number(it.quantity) || 0), 0);
  const sellerName = order?.seller?.name || t('orderConfirmation.seller', { defaultValue: 'Seller' });
  const showEscrow = order?.escrow?.status === 'ESCROW_HOLD' || order?.payment?.paidAt;
  const trackTarget = order?.order_number || order?.orderNumber || orderId;

  return (
    <BuyerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-16">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-primary)]" />
              <p className="text-sm text-gray-600">{t('orderConfirmation.loading', { defaultValue: 'Loading your order…' })}</p>
            </div>
          ) : error && !order ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-600 mb-6">{error}</p>
              <Link to="/account" className="text-sm font-semibold text-[var(--brand-primary)] hover:underline">
                {t('orderConfirmation.viewOrders', { defaultValue: 'View my orders' })}
              </Link>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 12px 40px rgba(34,197,94,0.35)' }}
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-3xl font-black mb-2" style={{ color: '#1a1a1a', letterSpacing: '-1px' }}>
                {t('orderConfirmation.placedTitle')}
              </h1>
              <p className="text-sm mb-1" style={{ color: '#6b7280' }}>
                {t('orderConfirmation.placedSubtitle')}
              </p>
              <p
                className="text-xs font-bold px-4 py-1.5 rounded-full inline-block mb-4"
                style={{ background: 'var(--brand-tint-strong)', color: 'var(--brand-primary)' }}
              >
                {t('orderConfirmation.orderNumber')} {displayNumber}
              </p>

              {unpaidIds.length > 0 && (
                <div
                  className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900"
                >
                  <p className="font-semibold">{t('checkout.multiPayNotice')}</p>
                  <Link to="/checkout" className="mt-2 inline-block font-semibold text-[var(--brand-primary)] hover:underline">
                    {t('orderConfirmation.payRemaining', { defaultValue: 'Complete payment for remaining orders' })}
                  </Link>
                </div>
              )}

              <div
                className="rounded-2xl p-6 mb-6 text-left space-y-4"
                style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--brand-tint)' }}
                    >
                      <Package className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
                        {t('orderConfirmation.estimatedDelivery')}
                      </p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>
                        {t('orderConfirmation.standardShipping')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{deliveryDate}</p>
                    <p className="text-xs" style={{ color: '#22c55e' }}>{t('orderConfirmation.onTime')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#fafafa' }}>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>
                      📦 {sellerName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                      {itemCount} {t('orderConfirmation.items')} · ETA: {deliveryDate}
                      {order?.total != null && (
                        <> · {formatOrderMoney(order.total, order.currency || 'RWF')}</>
                      )}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'var(--brand-tint)', color: 'var(--brand-primary)' }}
                  >
                    {statusLabel(order?.status, t)}
                  </span>
                </div>
              </div>

              {showEscrow && (
                <div
                  className="flex items-start gap-3 p-4 rounded-2xl mb-6 text-left"
                  style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <span className="text-xl flex-shrink-0">🔒</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>
                      {t('orderConfirmation.escrowActive')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                      {t('orderConfirmation.escrowNote')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={`/track/${encodeURIComponent(trackTarget)}`} className="flex-1">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm"
                    style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
                  >
                    <Truck className="w-4 h-4" /> {t('orderConfirmation.trackOrder')}
                  </motion.button>
                </Link>
                <Link to="/account" className="flex-1">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: 'white', color: '#374151', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}
                  >
                    {t('orderConfirmation.viewOrders', { defaultValue: 'View my orders' })}
                  </motion.button>
                </Link>
                <Link to="/" className="flex-1">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: '#f3f4f6', color: '#374151' }}
                  >
                    {t('orderConfirmation.continueShopping')}
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
