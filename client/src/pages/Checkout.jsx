import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle,
  Check,
  Lock,
  ShoppingBag,
  Smartphone,
  Shield,
  Wallet,
  Banknote,
} from 'lucide-react';
import CheckoutFocusLayout from '../components/checkout/CheckoutFocusLayout';
import { useBuyerCart } from '../stores/buyerCartStore';
import { paymentAPI, orderAPI, productAPI, shippingAPI } from '../services/api';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL, SERVER_URL } from '../lib/config';
import { useCurrencyPricing } from '../hooks/useCurrencyPricing';

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
  'w-full px-4 py-2.5 rounded-xl text-sm outline-none border bg-[var(--card-bg)] placeholder-gray-400 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] transition';
const inpStyle = { borderColor: 'var(--divider)' };

/** Must match server `fingerprintShippingAddress`. */
function fingerprintCheckoutAddress(address) {
  return [
    address.street?.toLowerCase().trim(),
    address.city?.toLowerCase().trim(),
    address.zip?.toLowerCase().trim(),
    String(address.country || '').toUpperCase().trim(),
  ].join('|');
}

function resolveShippingTotals(quote, methodsByGroup) {
  const byGroup = {};
  let totalShipping = 0;
  for (const g of quote?.groups || []) {
    const mk = methodsByGroup[g.groupKey] || 'standard';
    const m =
      (g.methods || []).find((x) => x.key === mk && x.enabled) ||
      (g.methods || []).find((x) => x.key === mk) ||
      (g.methods || []).find((x) => x.key === 'standard');
    const amt = Number(m?.price ?? 0);
    byGroup[g.groupKey] = amt;
    totalShipping += amt;
  }
  return { byGroup, totalShipping: Math.round(totalShipping * 100) / 100 };
}

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const items = useBuyerCart((s) => s.items);
  const clearCart = useBuyerCart((s) => s.clearCart);
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const currencyPricing = useCurrencyPricing();

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
  /** Spacilly: per shipment group `sellerId|warehouseId` → standard | express | pickup */
  const [shippingMethodsByGroup, setShippingMethodsByGroup] = useState({});
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteErr, setShippingQuoteErr] = useState(null);
  const [checkoutProvider, setCheckoutProvider] = useState('flutterwave');
  const [momoPhone, setMomoPhone] = useState('');
  const [airtelPhone, setAirtelPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [gateways, setGateways] = useState({
    flutterwave: false,
    mtn_momo: false,
    stripe: false,
    paypal: false,
    airtel_money: false,
  });
  const [gatewayOrderCurrency, setGatewayOrderCurrency] = useState({
    mtn_momo: 'RWF',
  });
  const [gwLoaded, setGwLoaded] = useState(false);
  const [codEnabled, setCodEnabled] = useState(false);
  const [salesTaxRate, setSalesTaxRate] = useState(0.18);
  const [loginHint, setLoginHint] = useState(false);

  useEffect(() => {
    shippingAPI
      .getPlatformContext()
      .then((ctx) => {
        setCodEnabled(ctx?.policy?.codEnabled !== false);
        const rate = Number(ctx?.policy?.salesTaxRate);
        if (Number.isFinite(rate) && rate >= 0 && rate <= 1) setSalesTaxRate(rate);
      })
      .catch(() => {
        setCodEnabled(false);
        setSalesTaxRate(0.18);
      });
  }, []);

  const codEligible = useMemo(() => {
    if (!codEnabled) return false;
    const c = String(address.country || shippingPreviewLocation?.country || '').toUpperCase();
    return c === 'RW' || c === 'RWA' || c.includes('RWANDA');
  }, [codEnabled, address.country, shippingPreviewLocation?.country]);

  const loadGateways = useCallback(() => {
    fetch(`${API_BASE_URL}/public/payment-gateways?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list = d?.gateways || [];
        const next = {
          flutterwave: false,
          mtn_momo: false,
          stripe: false,
          paypal: false,
          airtel_money: false,
        };
        list.forEach((x) => {
          if (x?.key && x.isEnabled === true) next[x.key] = true;
        });
        setGateways(next);
        const momoOrderCurrencyRaw = list.find((x) => x?.key === 'mtn_momo')?.orderCurrency;
        const momoOrderCurrency = String(momoOrderCurrencyRaw || '').trim().toUpperCase();
        setGatewayOrderCurrency({
          mtn_momo: ['RWF', 'USD', 'EUR'].includes(momoOrderCurrency) ? momoOrderCurrency : 'RWF',
        });
      })
      .catch(() => {
        setGateways({
          flutterwave: false,
          mtn_momo: false,
          stripe: false,
          paypal: false,
          airtel_money: false,
        });
        setGatewayOrderCurrency({ mtn_momo: 'RWF' });
      })
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
    window.addEventListener('spacilly:payment-gateways-changed', onAdminGw);
    let bc;
    try {
      bc = new BroadcastChannel('spacilly-payment-gateways');
      bc.onmessage = () => loadGateways();
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener('focus', loadGateways);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('spacilly:payment-gateways-changed', onAdminGw);
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
    if (!shippingPreviewLocation?.country && !shippingPreviewLocation?.city) return;
    setAddress((a) => ({
      ...a,
      country:
        a.country?.trim()
          ? a.country
          : shippingPreviewLocation.country || shippingPreviewLocation.countryCode || 'RW',
      city: a.city?.trim() ? a.city : shippingPreviewLocation.city,
      state: a.state?.trim() ? a.state : shippingPreviewLocation.state || shippingPreviewLocation.region || '',
      zip: a.zip?.trim() ? a.zip : shippingPreviewLocation.zip || '',
    }));
  }, [shippingPreviewLocation]);

  useEffect(() => {
    if (!gwLoaded) return;
    const enabled = (k) => {
      if (k === 'momo') return gateways.mtn_momo;
      if (k === 'airtel') return gateways.airtel_money;
      return gateways[k];
    };
    if (!enabled(checkoutProvider)) {
      const first = ['flutterwave', 'stripe', 'paypal', 'momo', 'airtel'].find(enabled);
      if (first) setCheckoutProvider(first);
    }
  }, [gwLoaded, gateways, checkoutProvider]);

  const resolvedShipping = useMemo(
    () => resolveShippingTotals(shippingQuote, shippingMethodsByGroup),
    [shippingQuote, shippingMethodsByGroup],
  );
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = resolvedShipping.totalShipping;
  const tax = Math.round(subtotal * salesTaxRate * 100) / 100;
  const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;
  const vatLabel = `VAT (${Math.round(salesTaxRate * 100)}%)`;

  const quoteFingerprint = useMemo(() => {
    const hasFull =
      !!address.street?.trim() && !!address.city?.trim() && !!address.country?.trim();
    return [
      hasFull ? 'full' : 'est',
      address.street?.toLowerCase().trim(),
      address.city?.toLowerCase().trim(),
      address.zip?.toLowerCase().trim(),
      address.country?.toUpperCase().trim(),
      items.map((i) => `${i.id}:${i.quantity}`).join(','),
      JSON.stringify(shippingMethodsByGroup),
    ].join('~');
  }, [address.street, address.city, address.zip, address.country, items, shippingMethodsByGroup]);

  useEffect(() => {
    if (!items.length) {
      setShippingQuote(null);
      return undefined;
    }
    const hasFull =
      address.street?.trim() && address.city?.trim() && address.country?.trim();
    const hasPartial = address.city?.trim() && address.country?.trim();
    if (!hasFull && !hasPartial) {
      setShippingQuote(null);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setShippingQuoteLoading(true);
      setShippingQuoteErr(null);
      try {
        const lines = items.map((i) => ({ productId: i.id, quantity: i.quantity }));
        const fullName =
          (address.fullName || user?.fullName || user?.name || 'Customer').trim() || 'Customer';
        let data;
        if (user?.id) {
          const intelligence = await orderAPI.checkoutIntelligence({
            lines,
            strategy: 'lowest_cost',
            selectedMethods: shippingMethodsByGroup,
            shippingAddress: hasFull
              ? {
                  full_name: fullName,
                  phone: address.phone || user?.phone || '000',
                  address_line1: address.street,
                  address_line2: '',
                  city: address.city,
                  state: address.state,
                  postal_code: address.zip,
                  country: address.country,
                }
              : {
                  full_name: fullName,
                  phone: address.phone || user?.phone || '000',
                  address_line1: `${address.city} (estimate)`,
                  address_line2: '',
                  city: address.city,
                  state: address.state || '—',
                  postal_code: address.zip || '00000',
                  country: address.country,
                },
            assistantContext: {
              nearestWarehouseAvailable: true,
              importTaxApplied: String(address.country || '').toUpperCase() !== 'RW',
              bulkyDimensions: false,
            },
          });
          data = {
            groups: intelligence?.optimization?.shipmentGroups || [],
            totalShipping: intelligence?.optimization?.totalShipping || 0,
            addressFingerprint: intelligence?.optimization?.addressFingerprint,
            warnings: intelligence?.optimization?.warnings || [],
            isEstimate: !hasFull,
            orderOptimization: intelligence?.optimization?.orderOptimization || null,
            aiSplitPlan: intelligence?.optimization?.aiSplitPlan || [],
            assistant: intelligence?.aiAssistant || null,
          };
          const suggestedMethods = intelligence?.optimization?.selectedMethods || {};
          if (Object.keys(suggestedMethods).length) {
            setShippingMethodsByGroup((prev) => ({ ...prev, ...suggestedMethods }));
          }
        } else {
          data = await shippingAPI.estimate({
            lines,
            destination: {
              country: address.country,
              city: address.city,
              state: address.state || '',
              postal_code: address.zip || '',
            },
            selectedMethods: shippingMethodsByGroup,
          });
        }
        if (cancelled) return;
        setShippingQuote(data);
        setShippingMethodsByGroup((prev) => {
          const next = { ...prev };
          for (const g of data.groups || []) {
            if (next[g.groupKey] == null) next[g.groupKey] = 'standard';
          }
          return next;
        });
      } catch (e) {
        if (!cancelled) {
          setShippingQuote(null);
          setShippingQuoteErr(e?.response?.data?.message || e?.message || 'Shipping quote failed');
        }
      } finally {
        if (!cancelled) setShippingQuoteLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [quoteFingerprint, items.length, user?.id]);

  const rwfLike = checkoutProvider === 'momo' || checkoutProvider === 'airtel';
  const fmtMoney = (n) =>
    rwfLike
      ? currencyPricing.formatLocalWithUsd(n)
      : currencyPricing.selectedCurrency === 'USD'
        ? currencyPricing.formatUsd(n)
        : currencyPricing.formatLocalWithUsd(n);

  const anyGatewayEnabled =
    gateways.flutterwave ||
    gateways.mtn_momo ||
    gateways.stripe ||
    gateways.paypal ||
    gateways.airtel_money ||
    codEligible;

  const canProceedToReview = anyGatewayEnabled && (checkoutProvider !== 'cod' || codEligible);

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const placeOrder = async () => {
    if (!agreedTerms) return alert(t('checkout.errors.agreeTerms'));
    if (!user?.id) {
      setLoginHint(true);
      navigate(`/auth?tab=login&redirect=${encodeURIComponent('/checkout')}`);
      return;
    }
    const isCod = checkoutProvider === 'cod';
    const gwOk = (k) => {
      if (k === 'cod') return codEligible;
      if (k === 'momo') return gateways.mtn_momo;
      if (k === 'airtel') return gateways.airtel_money;
      return gateways[k];
    };
    if (!gwOk(checkoutProvider)) {
      return alert(isCod ? 'Cash on delivery is not available for this address.' : t('checkout.errors.gatewayDisabled'));
    }
    if (!isCod && checkoutProvider === 'momo') {
      const ph = (momoPhone || address.phone || '').trim();
      if (!ph) return alert(t('checkout.errors.momoPhoneRequired'));
    }
    if (!isCod && checkoutProvider === 'airtel') {
      const ph = (airtelPhone || address.phone || '').trim();
      if (!ph) return alert(t('checkout.errors.airtelPhoneRequired'));
    }

    if (shippingQuoteLoading) {
      return alert(t('checkout.errors.shippingNotReady'));
    }
    if (shippingQuoteErr) {
      return alert(shippingQuoteErr);
    }
    if (!shippingQuote?.groups?.length && items.length) {
      return alert(t('checkout.errors.shippingNotReady'));
    }
    if (shippingQuote?.isEstimate) {
      return alert(t('checkout.errors.finalizeShippingAddress'));
    }
    const liveAddressFp = fingerprintCheckoutAddress(address);
    if (
      shippingQuote?.addressFingerprint &&
      liveAddressFp !== shippingQuote.addressFingerprint
    ) {
      return alert(t('checkout.errors.shippingQuoteChanged'));
    }
    if (
      !address.street?.trim() ||
      !address.city?.trim() ||
      !address.country?.trim() ||
      !((address.fullName || user?.fullName || user?.name || '').trim())
    ) {
      return alert(t('checkout.errors.finalizeShippingAddress'));
    }

    setPlacing(true);
    let createdOrders = null;
    try {
      const productById = new Map();
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
      }

      const linesBySeller = new Map();
      for (const line of items) {
        const p = productById.get(line.id);
        const sid = String(p.sellerId);
        if (!linesBySeller.has(sid)) linesBySeller.set(sid, []);
        linesBySeller.get(sid).push({
          product_id: line.id,
          quantity: line.quantity,
          ...(line.variantSku ? { variant_id: line.variantSku } : {}),
        });
      }

      const sellerGroups = [...linesBySeller.entries()].map(([sellerId, orderItems]) => ({
        sellerId,
        items: orderItems,
        subtotal: orderItems.reduce((s, it) => {
          const cartLine = items.find((l) => l.id === it.product_id && (!it.variant_id || l.variantSku === it.variant_id));
          if (cartLine?.price) return s + cartLine.price * it.quantity;
          const pr = productById.get(it.product_id);
          return s + (pr ? pr.price * it.quantity : 0);
        }, 0),
        discount: 0,
      }));

      const shippingMethodsPayload = { ...shippingMethodsByGroup };
      for (const g of shippingQuote?.groups || []) {
        if (shippingMethodsPayload[g.groupKey] == null) {
          shippingMethodsPayload[g.groupKey] = 'standard';
        }
      }

      const { byGroup, totalShipping: lockTotalShipping } = resolveShippingTotals(
        shippingQuote,
        shippingMethodsPayload,
      );

      const createRes = await orderAPI.create({
        sellerGroups,
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
        paymentMethod: isCod
          ? 'cash_on_delivery'
          : checkoutProvider === 'momo'
            ? gatewayOrderCurrency.mtn_momo
            : checkoutProvider === 'airtel'
              ? 'RWF'
              : 'card',
        displayCurrency: currencyPricing.selectedCurrency,
        shippingMethods: shippingMethodsPayload,
        notes: {},
        shippingQuoteLock:
          shippingQuote?.addressFingerprint && shippingQuote.isEstimate === false
            ? {
                addressFingerprint: shippingQuote.addressFingerprint,
                totalShipping: lockTotalShipping,
                byGroup,
              }
            : undefined,
      });

      const orders = createRes?.orders;
      if (!orders?.length) {
        setPlacing(false);
        return alert(t('checkout.errors.paymentInitFailed'));
      }

      createdOrders = orders;

      if (createRes?.skipPaymentInit || createRes?.paymentMode === 'cod') {
        clearCart();
        setPlacing(false);
        navigate('/account?tab=orders&placed=cod', {
          state: {
            message: 'Order placed! Pay cash when your delivery arrives.',
            orderNumbers: orders.map((o) => o.orderNumber || o.id),
          },
        });
        return;
      }

      try {
        if (orders.length > 1 && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(
            'spacilly_unpaid_order_ids',
            JSON.stringify(orders.slice(1).map((o) => String(o.id || o._id)))
          );
        }
      } catch {
        /* ignore */
      }
      const first = orders[0];
      const orderId = first.id || first._id;
      const init = await paymentAPI.initialize({
        orderId,
        paymentMethod: checkoutProvider,
        ...(checkoutProvider === 'momo' ? { momoPhone: momoPhone || address.phone } : {}),
        ...(checkoutProvider === 'airtel' ? { airtelPhone: airtelPhone || address.phone } : {}),
      });

      if ((init?.provider === 'flutterwave' || init?.provider === 'stripe' || init?.provider === 'paypal') && init?.paymentLink) {
        clearCart();
        if (orders.length > 1) alert(t('checkout.multiPayNotice'));
        window.location.href = init.paymentLink;
        return;
      }

      if (init?.provider === 'momo' && init?.referenceId) {
        clearCart();
        if (orders.length > 1) alert(t('checkout.multiPayNotice'));
        navigate(
          `/checkout/momo-wait?ref=${encodeURIComponent(init.referenceId)}&orderId=${encodeURIComponent(String(orderId))}`
        );
        return;
      }

      if (init?.provider === 'airtel' && init?.referenceId) {
        clearCart();
        if (orders.length > 1) alert(t('checkout.multiPayNotice'));
        navigate(
          `/checkout/momo-wait?ref=${encodeURIComponent(init.referenceId)}&orderId=${encodeURIComponent(String(orderId))}&provider=airtel`
        );
        return;
      }

      await Promise.allSettled(
        createdOrders.map((o) => orderAPI.cancel(String(o.id || o._id)).catch(() => null))
      );
      setPlacing(false);
      alert(t('checkout.errors.paymentInitFailed'));
    } catch (err) {
      console.error(err);
      if (createdOrders?.length) {
        await Promise.allSettled(
          createdOrders.map((o) => orderAPI.cancel(String(o.id || o._id)).catch(() => null))
        );
      }
      setPlacing(false);
      const msg = err?.response?.data?.message || err?.message || t('checkout.errors.paymentInitFailed');
      if (err?.response?.status === 409) {
        alert(msg || t('checkout.errors.shippingQuoteChanged'));
      } else {
        alert(msg);
      }
    }
  };

  if (items.length === 0)
    return (
      <CheckoutFocusLayout backTo="/">
        <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] flex-col items-center justify-center gap-4 px-4">
          <ShoppingBag className="h-14 w-14" style={{ color: 'var(--divider)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('checkout.emptyCart')}
          </h2>
          <Link to="/">
            <button
              className="rounded-2xl px-6 py-2.5 font-semibold text-white"
              style={{ background: 'var(--gradient-brand-cta)' }}
            >
              {t('checkout.shopNow')}
            </button>
          </Link>
        </div>
      </CheckoutFocusLayout>
    );

  return (
    <CheckoutFocusLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <button onClick={() => s.id < step && setStep(s.id)} className="group flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    background: step >= s.id ? 'var(--brand-primary)' : 'var(--divider)',
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: step >= s.id ? 'var(--brand-primary)' : 'var(--divider)' }}
                >
                  {step > s.id ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : (
                    <s.icon className="h-4 w-4" style={{ color: step >= s.id ? 'var(--text-on-accent)' : 'var(--text-muted)' }} />
                  )}
                </motion.div>
                <span className="hidden text-xs font-semibold sm:block" style={{ color: step >= s.id ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                  {t(s.key)}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1" style={{ background: step > s.id ? 'var(--brand-primary)' : 'var(--divider)' }} />
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
                style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
              >
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="mb-4 text-lg font-black" style={{ color: 'var(--text-primary)' }}>
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
                      style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
                    >
                      {t('checkout.continueToDelivery')}
                    </motion.button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <h2 className="mb-4 text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                      🚚 {t('checkout.spacillyShippingTitle')}
                    </h2>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {t('checkout.spacillyShippingIntro')}
                    </p>
                    {shippingQuoteLoading && (
                      <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        {t('checkout.spacillyShippingLoading')}
                      </div>
                    )}
                    {shippingQuoteErr && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                        {shippingQuoteErr}
                      </div>
                    )}
                    {(shippingQuote?.warnings || []).length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        {(shippingQuote.warnings || []).map((w) => (
                          <p key={w}>{w}</p>
                        ))}
                      </div>
                    )}
                    {shippingQuote?.orderOptimization && (
                      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--divider)', background: 'var(--bg-tertiary)' }}>
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          Smart optimization: {shippingQuote.orderOptimization.strategy}
                        </p>
                        <p style={{ color: 'var(--text-muted)' }}>
                          AI confidence {shippingQuote.orderOptimization.aiConfidence}% · Estimated savings {fmtMoney(shippingQuote.orderOptimization.estimatedSavings || 0)}
                        </p>
                      </div>
                    )}
                    {shippingQuote?.assistant?.message && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
                        {shippingQuote.assistant.message}
                      </div>
                    )}
                    {(shippingQuote?.groups || []).map((g) => (
                      <div
                        key={g.groupKey}
                        className="rounded-2xl border-2 p-4"
                        style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                              {g.warehouseLabel}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {t('checkout.spacillySellerGroup')}{' '}
                              <span className="font-mono">{String(g.sellerId).slice(-6)}</span>
                              {' · '}
                              {g.distanceKm} km {t('checkout.spacillyByRoad')}
                            </p>
                          </div>
                          <Truck className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                        </div>
                        <ul className="mb-3 space-y-1 border-t border-dashed pt-2 text-xs" style={{ borderColor: 'var(--divider)' }}>
                          {(g.lines || []).map((ln) => (
                            <li key={ln.productId} className="flex justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
                              <span className="truncate">
                                {ln.name} ×{ln.quantity}
                              </span>
                              <span className="font-semibold">{fmtMoney(ln.unitPrice * ln.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          {t('checkout.spacillyChooseMethod')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(g.methods || []).map((m) => {
                              const selected = shippingMethodsByGroup[g.groupKey] === m.key;
                              return (
                                <button
                                  key={`${g.groupKey}-${m.key}`}
                                  type="button"
                                  disabled={!m.enabled}
                                  onClick={() => {
                                    if (!m.enabled) return;
                                    setShippingMethodsByGroup((prev) => ({ ...prev, [g.groupKey]: m.key }));
                                  }}
                                  className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-45"
                                  style={{
                                    borderColor: selected ? 'var(--brand-primary)' : 'var(--divider)',
                                    background: selected ? 'var(--brand-tint)' : 'transparent',
                                  }}
                                >
                                  <div>
                                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                      {m.label}
                                      {m.key === 'pickup' && m.pickupAvailable ? (
                                        <span className="ml-2 text-[10px] font-bold text-emerald-600"> {t('checkout.spacillyPickupBadge')}</span>
                                      ) : null}
                                    </p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                      {m.etaDaysMin}–{m.etaDaysMax} {t('checkout.spacillyEtaDays')}
                                      {m.freeShippingThreshold != null && m.freeShippingThreshold > 0
                                        ? ` · ${t('checkout.spacillyFreePrefix')} ${fmtMoney(m.freeShippingThreshold)}`
                                        : ''}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold" style={{ color: 'var(--brand-primary)' }}>
                                      {m.freeShippingApplied ? t('checkout.spacillyFree') : fmtMoney(m.price)}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={prevStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {t('buttons.back')}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={nextStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-bold text-white"
                        style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
                      >
                        {t('checkout.continueToPayment')}
                      </motion.button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="mb-2 text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                      💳 {t('checkout.paymentMethod')}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('checkout.gatewayHint')}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {gateways.flutterwave && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('flutterwave')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'flutterwave' ? 'var(--brand-primary)' : 'var(--divider)',
                            background: checkoutProvider === 'flutterwave' ? 'var(--brand-tint)' : 'var(--card-bg)',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#635bff,#7c3aed)' }}
                            >
                              <CreditCard className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                              {t('checkout.payFlutterwave')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {t('checkout.payFlutterwaveSub')}
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Shield className="h-3.5 w-3.5" /> {t('checkout.secureBadge')}
                          </div>
                        </button>
                      )}
                      {gateways.stripe && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('stripe')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'stripe' ? 'var(--brand-primary)' : 'var(--divider)',
                            background: checkoutProvider === 'stripe' ? 'var(--brand-tint)' : 'var(--card-bg)',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#635bff,#2563eb)' }}
                            >
                              <CreditCard className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                              {t('checkout.payStripe')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {t('checkout.payStripeSub')}
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Shield className="h-3.5 w-3.5" /> {t('checkout.secureBadge')}
                          </div>
                        </button>
                      )}
                      {gateways.paypal && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('paypal')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'paypal' ? 'var(--brand-primary)' : 'var(--divider)',
                            background: checkoutProvider === 'paypal' ? 'var(--brand-tint)' : 'var(--card-bg)',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#0070ba,#003087)' }}
                            >
                              <Wallet className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                              {t('checkout.payPaypal')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {t('checkout.payPaypalSub')}
                          </p>
                        </button>
                      )}
                      {gateways.mtn_momo && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('momo')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'momo' ? 'var(--brand-primary)' : 'var(--divider)',
                            background: checkoutProvider === 'momo' ? 'var(--brand-tint)' : 'var(--card-bg)',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#ffcd00,#f59e0b)' }}
                            >
                              <Smartphone className="h-5 w-5 text-gray-900" />
                            </div>
                            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                              {t('checkout.payMomo')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {t('checkout.payMomoSub')}
                          </p>
                        </button>
                      )}
                      {gateways.airtel_money && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('airtel')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md"
                          style={{
                            borderColor: checkoutProvider === 'airtel' ? 'var(--brand-primary)' : 'var(--divider)',
                            background: checkoutProvider === 'airtel' ? 'var(--brand-tint)' : 'var(--card-bg)',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#e11d48,#be123c)' }}
                            >
                              <Smartphone className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                              {t('checkout.payAirtel')}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {t('checkout.payAirtelSub')}
                          </p>
                        </button>
                      )}
                      {codEligible && (
                        <button
                          type="button"
                          onClick={() => setCheckoutProvider('cod')}
                          className="flex flex-col rounded-2xl border-2 p-5 text-left transition hover:shadow-md sm:col-span-2"
                          style={{
                            borderColor: checkoutProvider === 'cod' ? 'var(--brand-primary)' : 'var(--divider)',
                            background: checkoutProvider === 'cod' ? 'var(--brand-tint)' : 'var(--card-bg)',
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
                            >
                              <Banknote className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                              Pay on delivery (Cash)
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            Popular in Rwanda — pay the driver or seller when you receive your order. No mobile money needed now.
                          </p>
                        </button>
                      )}
                    </div>
                    {!anyGatewayEnabled && gwLoaded && (
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
                    {checkoutProvider === 'airtel' && (
                      <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {t('checkout.airtelPayerPhone')}
                        </label>
                        <input
                          type="tel"
                          placeholder={t('checkout.airtelPayerPhonePh')}
                          value={airtelPhone}
                          onChange={(e) => setAirtelPhone(e.target.value)}
                          className={inp}
                          style={inpStyle}
                        />
                        <p className="text-[11px] text-gray-500">{t('checkout.airtelPayerHint')}</p>
                      </div>
                    )}
                    {checkoutProvider === 'flutterwave' && (
                      <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                        {t('checkout.flutterwaveHosted')}
                      </div>
                    )}
                    {checkoutProvider === 'stripe' && (
                      <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                        {t('checkout.stripeHosted')}
                      </div>
                    )}
                    {checkoutProvider === 'paypal' && (
                      <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                        {t('checkout.paypalHosted')}
                      </div>
                    )}
                    {checkoutProvider === 'cod' && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                        You will pay in cash (RWF) when the order arrives. Keep your phone nearby for delivery updates.
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={prevStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {t('buttons.back')}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={nextStep}
                        disabled={!canProceedToReview}
                        className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
                      >
                        {t('checkout.reviewOrder')}
                      </motion.button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="mb-4 text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                      ✅ {t('checkout.reviewYourOrder')}
                    </h2>
                    {shippingQuote && !shippingQuote.isEstimate && (
                      <div
                        className="mb-4 flex gap-3 rounded-xl border p-4 text-xs leading-relaxed"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, var(--divider))',
                          background: 'var(--brand-tint)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Lock className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                        <p>{t('checkout.shippingLockedNotice')}</p>
                      </div>
                    )}
                    {shippingQuote?.groups?.length > 0 && (
                      <div className="mb-4 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--divider)', background: 'var(--bg-tertiary)' }}>
                        <p className="mb-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                          {t('checkout.spacillyShippingBreakdown')}
                        </p>
                        <ul className="space-y-2">
                          {shippingQuote.groups.map((g) => {
                            const mk = shippingMethodsByGroup[g.groupKey] || 'standard';
                            const m = (g.methods || []).find((x) => x.key === mk);
                            return (
                              <li key={g.groupKey} className="flex justify-between gap-2">
                                <span className="text-[var(--text-muted)]">
                                  {g.warehouseLabel} · {mk}
                                </span>
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {m?.freeShippingApplied ? t('checkout.spacillyFree') : fmtMoney(m?.price ?? 0)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div className="mb-4 space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg-tertiary)' }}>
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
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
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {item.title}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {t('checkout.qty')} {item.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>
                            {fmtMoney(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={agreedTerms}
                      onClick={() => setAgreedTerms((v) => !v)}
                      className="w-full rounded-xl border p-3 text-left transition-colors"
                      style={{
                        borderColor: agreedTerms ? 'var(--brand-border-subtle)' : 'var(--divider)',
                        background: agreedTerms ? 'var(--brand-tint)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <motion.span
                          initial={false}
                          animate={
                            agreedTerms
                              ? { scale: 1, boxShadow: '0 0 0 0 color-mix(in srgb, var(--brand-primary) 0%, transparent)' }
                              : { scale: [1, 1.08, 1], boxShadow: '0 0 0 8px color-mix(in srgb, var(--brand-primary) 0%, transparent)' }
                          }
                          transition={agreedTerms ? { duration: 0.2 } : { duration: 1.2, repeat: Infinity, repeatDelay: 0.7 }}
                          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                          style={{
                            borderColor: agreedTerms ? 'var(--brand-primary)' : 'var(--divider-strong)',
                            background: agreedTerms ? 'var(--brand-primary)' : 'var(--card-bg)',
                          }}
                        >
                          <AnimatePresence initial={false}>
                            {agreedTerms && (
                              <motion.span
                                key="agree-check"
                                initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.4, rotate: 20 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                              >
                                <Check className="h-4 w-4" style={{ color: 'var(--text-on-accent)' }} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.span>
                        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {t('checkout.agreePrefix')} <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{t('checkout.termsOfService')}</span>{' '}
                          {t('checkout.agreeMiddle')} <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{t('checkout.refundPolicy')}</span>
                        </span>
                      </div>
                    </button>
                    <div
                      className="flex items-center gap-2 rounded-xl p-3"
                      style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
                    >
                      <Lock className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--badge-success-text)' }} />
                      <span className="text-xs" style={{ color: 'var(--badge-success-text)' }}>
                        {t('checkout.escrowNote')}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Exchange rate locked at checkout.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={prevStep}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {t('buttons.back')}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={placeOrder}
                        disabled={placing || !agreedTerms}
                        className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
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
            className="sticky top-[calc(3.25rem+env(safe-area-inset-top,0px))] h-fit space-y-4 rounded-2xl p-5 lg:top-6"
            style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
          >
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
              {t('checkout.orderSummary')}
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
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
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      ×{item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    {fmtMoney(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{t('checkout.subtotal')}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {fmtMoney(subtotal)}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t('checkout.spacillyShippingBreakdown')}
              </p>
              {shippingQuoteLoading && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('checkout.spacillyShippingLoading')}
                </div>
              )}
              {(shippingQuote?.groups || []).map((g) => {
                const mk = shippingMethodsByGroup[g.groupKey] || 'standard';
                const m = (g.methods || []).find((x) => x.key === mk);
                return (
                  <div key={`sum-${g.groupKey}`} className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="max-w-[58%] truncate">{g.warehouseLabel}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {m?.freeShippingApplied ? t('checkout.spacillyFree') : fmtMoney(m?.price ?? 0)}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                <span>{t('checkout.shipping')}</span>
                <span>{fmtMoney(shippingCost)}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{vatLabel}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {fmtMoney(tax)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-black" style={{ borderColor: 'var(--divider)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{t('checkout.total')}</span>
                <span style={{ color: 'var(--brand-primary)', fontSize: '1.1rem' }}>{fmtMoney(total)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl p-2 text-xs" style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', border: '1px solid var(--badge-success-border)' }}>
              <Lock className="h-3.5 w-3.5 flex-shrink-0" /> {t('checkout.escrowProtected')}
            </div>
          </div>
        </div>
      </div>
    </CheckoutFocusLayout>
  );
}
