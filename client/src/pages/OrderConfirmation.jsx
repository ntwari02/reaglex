import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Truck, Download, MapPin } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useTranslation } from '../i18n/useTranslation';

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const today = new Date();
  const delivery = new Date(today.getTime() + 5 * 24 * 3600 * 1000);
  const fmt = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <BuyerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-16">
        <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center"
        >
          {/* Success icon */}
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
          <p className="text-xs font-bold px-4 py-1.5 rounded-full inline-block mb-8"
            style={{ background: '#fff7ed', color: '#ff8c42' }}>
            {t('orderConfirmation.orderNumber')} {orderId}
          </p>

          {/* Order info card */}
          <div className="rounded-2xl p-6 mb-6 text-left space-y-4"
            style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,140,66,0.1)' }}>
                  <Package className="w-5 h-5" style={{ color: '#ff8c42' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{t('orderConfirmation.estimatedDelivery')}</p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>{t('orderConfirmation.standardShipping')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>{fmt(delivery)}</p>
                <p className="text-xs" style={{ color: '#22c55e' }}>{t('orderConfirmation.onTime')}</p>
              </div>
            </div>

            {/* Sub-orders by seller */}
            {[
              { seller: t('orderConfirmation.premiumStore'), items: 1, status: t('orderConfirmation.processing'), eta: fmt(delivery) },
            ].map((o, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: '#fafafa' }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>📦 {o.seller}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{o.items} {t('orderConfirmation.items')} · ETA: {o.eta}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(255,140,66,0.1)', color: '#ff8c42' }}>{o.status}</span>
              </div>
            ))}
          </div>

          {/* Escrow notice */}
          <div className="flex items-start gap-3 p-4 rounded-2xl mb-6 text-left"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="text-xl flex-shrink-0">🔒</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>{t('orderConfirmation.escrowActive')}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {t('orderConfirmation.escrowNote')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/track/${orderId}`} className="flex-1">
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}>
                <Truck className="w-4 h-4" /> {t('orderConfirmation.trackOrder')}
              </motion.button>
            </Link>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
              style={{ background: 'white', color: '#374151', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
              <Download className="w-4 h-4" /> {t('orderConfirmation.downloadInvoice')}
            </motion.button>
            <Link to="/" className="flex-1">
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: '#f3f4f6', color: '#374151' }}>
                {t('orderConfirmation.continueShopping')}
              </motion.button>
            </Link>
          </div>
        </motion.div>
        </div>
      </div>
    </BuyerLayout>
  );
}
