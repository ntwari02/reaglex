import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle,
  Lock,
  ShoppingBag,
  ArrowLeft,
  Smartphone,
  Shield,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useBuyerCart } from '../stores/buyerCartStore';
import { paymentAPI, orderAPI, productAPI } from '../services/api';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL, SERVER_URL } from '../lib/config';

const resolveImg = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
  return src.startsWith('http') ? src : `${SERVER_URL}${src}`;
};

const STEPS = [
  { id: 1, key: 'checkout.steps.address', icon: MapPin },
  { id: 2, key: 'checkout.steps.delivery', icon: Truck },
  { id: 3, key: 'checkout.steps.payment', icon: CreditCard },
  { id: 4, key: 'checkout.steps.confirm', icon: CheckCircle },
];

const inp =
  'w-full px-4 py-2.5 rounded-xl text-sm outline-none border bg-[var(--card-bg)] placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition';
const inpStyle = { borderColor: '#e5e7eb' };

const DELIVERY_OPTIONS = [
  { id: 'standard', labelKey: 'checkout.delivery.standard', subKey: 'checkout.delivery.standardSub', price: 4.99, icon: '📦' },
  { id: 'express', labelKey: 'checkout.delivery.express', subKey: 'checkout.delivery.expressSub', price: 12.99, icon: '⚡' },
  { id: 'overnight', labelKey: 'checkout.delivery.overnight', subKey: 'checkout.delivery.overnightSub', price: 24.99, icon: '🚀' },
];

function mapDeliveryToApi(id) {
  if (id === 'overnight') return 'international';
  return id;
}

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const items = useBuyerCart((s) => s.items);
  const clearCart = useBuyerCart((s) => s.clearCart);

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });
  const [delivery, setDelivery] = useState('standard');
  const [checkoutProvider, setCheckoutProvider] = useState('flutterwave');
  const [momoPhone, setMomoPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [gateways, setGateways] = useState({ flutterwave: true, mtn_momo: false });
  const [gwLoaded, setGwLoaded] = useState(false);

  const loadGateways = useCallback(() => {
    fetch(`${API_BASE_URL}/public/payment-gateways?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list = d?.gateways || [];
        const flw = list.find((x) => x.key === 'flutterwave');
        const momo = list.find((x) => x.key === 'mtn_momo');
        setGateways({
          flutterwave: flw?.isEnabled === true,
          mtn_momo: momo?.isEnabled === true,
        });
      })
      .catch(() => setGateways({ flutterwave: true, mtn_momo: false }))
      .finally(() => setGwLoaded(true));
  }, []);

  useEffect(() => {
    loadGateways();
  }, [loadGateways]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadGateways();
    };
    const onAdminGw = () => loadGateways();
    window.addEventListener('focus', loadGateways);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('reaglex:payment-gateways-changed', onAdminGw);
    let bc;
    try {
      bc = new BroadcastChannel('reaglex-payment-gateways');
      bc.onmessage = () => loadGateways();
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener('focus', loadGateways);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('reaglex:payment-gateways-changed', onAdminGw);
      try {
        bc?.close();
      } catch {
        /* ignore */
      }
    };
  }, [loadGateways]);

  useEffect(() => {
    if (step !== 3) return undefined;
    const id = window.setInterval(() => loadGateways(), 8000);
    return () => window.clearInterval(id);
  }, [step, loadGateways]);

  useEffect(() => {
    if (user) {
      setAddress((a) => ({
        ...a,
        email: user.email || a.email,
        fullName: (user.fullName || user.name || a.fullName || '').trim() || a.fullName,
        phone: user.phone || a.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!gwLoaded) return;
    if (checkoutProvider === 'flutterwave' && !gateways.flutterwave && gateways.mtn_momo) {
      setCheckoutProvider('momo');
    }
    if (checkoutProvider === 'momo' && !gateways.mtn_momo && gateways.flutterwave) {
      setCheckoutProvider('flutterwave');
    }
  }, [gwLoaded, gateways, checkoutProvider]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = DELIVERY_OPTIONS.find((d) => d.id === delivery)?.price || 4.99;
  const tax = subtotal * 0.1;
  const total = subtotal + shippingCost + tax;

  const fmtMoney = (n) =>
    checkoutProvider === 'momo'
      ? `RWF ${Math.round(n).toLocaleString()}`
      : `$${Number(n).toFixed(2)}`;

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const placeOrder = async () => {
    if (!agreedTerms) return alert(t('checkout.errors.agreeTerms'));
    if (!user?.id) {
      navigate(`/auth?tab=login&redirect=${encodeURIComponent('/checkout')}`);
      return;
    }
    if (checkoutProvider === 'flutterwave' && !gateways.flutterwave) {
      return alert(t('checkout.errors.gatewayDisabled'));
    }
    if (checkoutProvider === 'momo' && !gateways.mtn_momo) {
      return alert(t('checkout.errors.gatewayDisabled'));
    }
    if (checkoutProvider === 'momo') {
      const ph = (momoPhone || address.phone || '').trim();
      if (!ph) return alert(t('checkout.errors.momoPhoneRequired'));
    }

    setPlacing(true);
    try {
      const productById = new Map();
      const sellerIds = new Set();
      for (const line of items) {
        const res = await productAPI.getProductById(line.id);
        const p = res?.product;
        if (!p) {
          setPlacing(false);
          return alert(t('checkout.errors.productUnavailable'));
        }
        const sid = String(p.sellerId || '');
        if (!sid) {
          setPlacing(false);
          return alert(t('checkout.errors.productUnavailable'));
        }
        productById.set(line.id, p);
        sellerIds.add(sid);
      }

      if (sellerIds.size !== 1) {
        setPlacing(false);
        return alert(t('checkout.errors.multiSeller'));
      }

      const sellerId = [...sellerIds][0];
      const shipKey = mapDeliveryToApi(delivery);
      let subFromDb = 0;
      const orderItems = items.map((line) => {
        const p = productById.get(line.id);
        subFromDb += p.price * line.quantity;
        return { product_id: line.id, quantity: line.quantity };
      });

      const createRes = await orderAPI.create({
        sellerGroups: [
          {
            sellerId,
            items: orderItems,
            subtotal: subFromDb,
            discount: 0,
          },
        ],
        shippingAddress: {
          full_name: address.fullName,
          phone: address.phone,
          address_line1: address.street,
          address_line2: '',
          city: address.city,
          state: address.state,
          postal_code: address.zip,
          country: address.country,
        },
        paymentMethod: checkoutProvider === 'momo' ? 'RWF' : 'card',
        shippingMethods: { [sellerId]: shipKey },
        notes: {},
      });

      const orders = createRes?.orders;
      if (!orders?.length) {
        setPlacing(false);
        return alert(t('checkout.errors.paymentInitFailed'));
      }

      const first = orders[0];
      const orderId = first.id || first._id;
      const init = await paymentAPI.initialize({
        orderId,
        paymentMethod: checkoutProvider === 'momo' ? 'momo' : 'flutterwave',
        ...(checkoutProvider === 'momo' ? { momoPhone: momoPhone || address.phone } : {}),
      });

      if (init?.provider === 'flutterwave' && init?.paymentLink) {
        clearCart();
        window.location.href = init.paymentLink;
        return;
      }

      if (init?.provider === 'momo' && init?.referenceId) {
        clearCart();
        navigate(
          `/checkout/momo-wait?ref=${encodeURIComponent(init.referenceId)}&orderId=${encodeURIComponent(String(orderId))}`
        );
        return;
      }

      setPlacing(false);
      alert(t('checkout.errors.paymentInitFailed'));
    } catch (err) {
      console.error(err);
      setPlacing(false);
      const msg = err?.response?.data?.message || err?.message || t('checkout.errors.paymentInitFailed');
      alert(msg);
    }
  };

  if (items.length === 0)
    return (
      <BuyerLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
          <ShoppingBag className="h-14 w-14" style={{ color: '#e5e7eb' }} />
          <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
            {t('checkout.emptyCart')}
          </h2>
          <Link to="/">
            <button
              className="rounded-2xl px-6 py-2.5 font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)' }}
            >
              {t('checkout.shopNow')}
            </button>
          </Link>
        </div>
      </BuyerLayout>
    );

  return (
    <BuyerLayout>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        <motion.button
          whileHover={{ x: -3 }}
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold"
          style={{ color: '#6b7280' }}
        >
          <ArrowLeft className="h-4 w-4" /> {t('checkout.backToCart')}
        </motion.button>

        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <button onClick={() => s.id < step && setStep(s.id)} className="group flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    background: step >= s.id ? '#ff8c42' : '#e5e7eb',
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: step >= s.id ? '#ff8c42' : '#e5e7eb' }}
                >
                  {step > s.id ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : (
                    <s.icon className="h-4 w-4" style={{ color: step >= s.id ? 'white' : '#9ca3af' }} />
                  )}
                </motion.div>
                <span className="hidden text-xs font-semibold sm:block" style={{ color: step >= s.id ? '#ff8c42' : '#9ca3af' }}>
                  {t(s.key)}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1" style={{ background: step > s.id ? '#ff8c42' : '#e5e7eb' }} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl p-6"
                style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
              >
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="mb-4 text-lg font-black" style={{ color: '#1a1a1a' }}>
                      📍 {t('checkout.shippingAddress')}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        ['fullName', 'checkout.fields.fullName'],
                        ['email', 'checkout.fields.email'],
                        ['phone', 'checkout.fields.phone'],
                        ['street', 'checkout.fields.street'],
                        ['city', 'checkout.fields.city'],
                        ['state', 'checkout.fields.state'],
                        ['zip', 'checkout.fields.zip'],
                        ['country', 'checkout.fields.country'],
                      ].map(([f, ph]) => (
                        <input
                          key={f}
                          type="text"
                          placeholder={t(ph)}
                          value={address[f]}
                          onChange={(e) => setAddress({ ...address, [f]: e.target.value })}
                          className={`${inp} ${f === 'street' ? 'sm:col-span-2' : ''}`}
                          style={inpStyle}
                        />
                      ))}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={nextStep}
                      className="mt-2 w-full rounded-2xl py-3 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}
                    >
                      {t('checkout.continueToDelivery')}
                    </motion.button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <h2 className="mb-4 text-lg font-black" style={{ color: '#1a1a1a' }}>
                      🚚 {t('checkout.deliveryMethod')}
                    </h2>
                    {DELIVERY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDelivery(opt.id)}
                        className="flex w-full items-center justify-between rounded-2xl border-2 p-4 transition"
                        style={{
                          borderColor: delivery === opt.id ? '#ff8c42' : '#e5e7eb',
                          background: delivery === opt.id ? 'rgba(255,140,66,0.05)' : 'white',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{opt.icon}</span>
                          <div className="text-left">
                            <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                              {t(opt.labelKey)}
                            </p>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>
                              {t(opt.subKey)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: '#ff8c42' }}>
                            {fmtMoney(opt.price)}
                          </p>
                          <div
                            className="mx-auto mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2"
                            style={{ borderColor: delivery === opt.id ? '#ff8c42' : '#d1d5db' }}
                          >
                            {delivery === opt.id && <div className="h-2 w-2 rounded-full" style={{ background: '#ff8c42' }} />}
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={prevStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{ background: '#f3f4f6', color: '#374151' }}
                      >
                        {t('buttons.back')}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={nextStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}
                      >
                        {t('checkout.continueToPayment')}
                      </motion.button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="mb-2 text-lg font-black" style={{ color: '#1a1a1a' }}>
                      💳 {t('checkout.paymentMethod')}
                    </h2>
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      {t('checkout.gatewayHint')}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {gateways.flutterwave && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('flutterwave')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'flutterwave' ? '#ff8c42' : '#e5e7eb',
                            background: checkoutProvider === 'flutterwave' ? 'rgba(255,140,66,0.06)' : '#fff',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#635bff,#7c3aed)' }}
                            >
                              <CreditCard className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-black" style={{ color: '#1a1a1a' }}>
                              {t('checkout.payFlutterwave')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                            {t('checkout.payFlutterwaveSub')}
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Shield className="h-3.5 w-3.5" /> {t('checkout.secureBadge')}
                          </div>
                        </button>
                      )}
                      {gateways.mtn_momo && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('momo')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'momo' ? '#ff8c42' : '#e5e7eb',
                            background: checkoutProvider === 'momo' ? 'rgba(255,140,66,0.06)' : '#fff',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#ffcd00,#f59e0b)' }}
                            >
                              <Smartphone className="h-5 w-5 text-gray-900" />
                            </div>
                            <span className="text-sm font-black" style={{ color: '#1a1a1a' }}>
                              {t('checkout.payMomo')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                            {t('checkout.payMomoSub')}
                          </p>
                        </button>
                      )}
                    </div>
                    {!gateways.flutterwave && !gateways.mtn_momo && gwLoaded && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        {t('checkout.errors.noGateway')}
                      </div>
                    )}
                    {checkoutProvider === 'momo' && (
                      <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {t('checkout.momoPayerPhone')}
                        </label>
                        <input
                          type="tel"
                          placeholder={t('checkout.momoPayerPhonePh')}
                          value={momoPhone}
                          onChange={(e) => setMomoPhone(e.target.value)}
                          className={inp}
                          style={inpStyle}
                        />
                        <p className="text-[11px] text-gray-500">{t('checkout.momoPayerHint')}</p>
                      </div>
                    )}
                    {checkoutProvider === 'flutterwave' && (
                      <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                        {t('checkout.flutterwaveHosted')}
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={prevStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{ background: '#f3f4f6', color: '#374151' }}
                      >
                        {t('buttons.back')}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={nextStep}
                        disabled={!gateways.flutterwave && !gateways.mtn_momo}
                        className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}
                      >
                        {t('checkout.reviewOrder')}
                      </motion.button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="mb-4 text-lg font-black" style={{ color: '#1a1a1a' }}>
                      ✅ {t('checkout.reviewYourOrder')}
                    </h2>
                    <div className="mb-4 space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#fafafa' }}>
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl" style={{ background: '#f3f4f6' }}>
                            <img
                              src={resolveImg(item.image)}
                              alt={item.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                              {item.title}
                            </p>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>
                              {t('checkout.qty')} {item.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#ff8c42' }}>
                            {fmtMoney(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-orange-500"
                      />
                      <span className="text-xs" style={{ color: '#6b7280' }}>
                        {t('checkout.agreePrefix')} <span style={{ color: '#ff8c42' }}>{t('checkout.termsOfService')}</span>{' '}
                        {t('checkout.agreeMiddle')} <span style={{ color: '#ff8c42' }}>{t('checkout.refundPolicy')}</span>
                      </span>
                    </label>
                    <div
                      className="flex items-center gap-2 rounded-xl p-3"
                      style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
                    >
                      <Lock className="h-4 w-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                      <span className="text-xs" style={{ color: '#16a34a' }}>
                        {t('checkout.escrowNote')}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={prevStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{ background: '#f3f4f6', color: '#374151' }}
                      >
                        {t('buttons.back')}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={placeOrder}
                        disabled={placing || !agreedTerms}
                        className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}
                      >
                        {placing ? t('checkout.placingOrder') : `${t('checkout.placeOrder')} · ${fmtMoney(total)}`}
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="sticky top-20 h-fit space-y-4 rounded-2xl p-5"
            style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
          >
            <h3 className="text-sm font-black" style={{ color: '#1a1a1a' }}>
              {t('checkout.orderSummary')}
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg" style={{ background: '#f3f4f6' }}>
                    <img
                      src={resolveImg(item.image)}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold" style={{ color: '#1a1a1a' }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>
                      ×{item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#1a1a1a' }}>
                    {fmtMoney(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3" style={{ borderColor: '#f3f4f6' }}>
              {[
                [t('checkout.subtotal'), fmtMoney(subtotal)],
                [t('checkout.shipping'), fmtMoney(shippingCost)],
                [t('checkout.tax10'), fmtMoney(tax)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                  <span>{l}</span>
                  <span className="font-semibold" style={{ color: '#1a1a1a' }}>
                    {v}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 font-black" style={{ borderColor: '#f3f4f6' }}>
                <span style={{ color: '#1a1a1a' }}>{t('checkout.total')}</span>
                <span style={{ color: '#ff8c42', fontSize: '1.1rem' }}>{fmtMoney(total)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl p-2 text-xs" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Lock className="h-3.5 w-3.5 flex-shrink-0" /> {t('checkout.escrowProtected')}
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
