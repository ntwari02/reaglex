import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import {
  DEFAULT_SCHEDULE,
  fetchFeeSchedule,
  type FeeSchedule,
  type FeeSchedulePaymentMethod,
} from '../services/feeScheduleApi';

type PaymentMethodKey = 'card' | 'mtn' | 'airtel' | 'bank_local' | 'bank_intl';

function useAnimatedNumber(value: number, duration = 400) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(value);
  const toRef = useRef(value);

  useEffect(() => {
    fromRef.current = display;
    toRef.current = value;
    startRef.current = null;

    let frameId: number;

    const step = (timestamp: number) => {
      if (startRef.current == null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(next);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

export default function SellerFees() {
  const [feeSchedule, setFeeSchedule] = useState<FeeSchedule>(DEFAULT_SCHEDULE);
  const [showSticky, setShowSticky] = useState(false);
  const [priceInput, setPriceInput] = useState<string>('29');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('card');
  const faqItems =
    feeSchedule.faq?.length > 0 ? feeSchedule.faq : DEFAULT_SCHEDULE.faq;
  const [openFaqId, setOpenFaqId] = useState<string | null>(faqItems[0]?.id ?? null);

  useEffect(() => {
    fetchFeeSchedule().then((schedule) => {
      setFeeSchedule(schedule);
      if (schedule.faq?.[0]?.id) {
        setOpenFaqId(schedule.faq[0].id);
      }
    });
  }, []);

  const paymentMethods = feeSchedule.paymentMethods as FeeSchedulePaymentMethod[];
  const commissionRate = feeSchedule.commissionRate;
  const defaultProcessingRate = feeSchedule.defaultProcessingRate;
  const commissionLabel = `${feeSchedule.commissionPercent}%`;
  const processingLabel = `${(defaultProcessingRate * 100).toFixed(1)}%`;

  const heroRef = useRef<HTMLDivElement | null>(null);
  const calculatorRef = useRef<HTMLDivElement | null>(null);

  const parsedPrice = useMemo(() => {
    const clean = priceInput.replace(/[^\d.]/g, '');
    const n = parseFloat(clean);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [priceInput]);

  const saleTotal = Math.max(0, parsedPrice * Math.max(1, quantity));
  const paymentRate = paymentMethods.find((m) => m.key === paymentMethod)?.rate ?? defaultProcessingRate;
  const commissionFee = saleTotal * commissionRate;
  const processingFee = saleTotal * paymentRate;
  const payout = Math.max(0, saleTotal - commissionFee - processingFee);
  const keepPercent = saleTotal > 0 ? (payout / saleTotal) * 100 : 0;
  const monthlyEstimate = payout * 10; // 10 items / month

  const animatedSaleTotal = useAnimatedNumber(saleTotal);
  const animatedCommission = useAnimatedNumber(commissionFee);
  const animatedProcessing = useAnimatedNumber(processingFee);
  const animatedPayout = useAnimatedNumber(payout);
  const animatedMonthly = useAnimatedNumber(monthlyEstimate);
  const animatedKeepPercent = useAnimatedNumber(keepPercent);

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) {
        setShowSticky(false);
        return;
      }
      const rect = heroRef.current.getBoundingClientRect();
      setShowSticky(rect.bottom < 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToCalculator = () => {
    if (calculatorRef.current) {
      calculatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const formatMoney = (v: number, decimals: number = 2) =>
    `$${v.toFixed(decimals)}`;

  return (
    <BuyerLayout>
      <div className="w-full seller-fees-page text-[var(--text-primary)]">
        {/* Sticky fee bar */}
        <AnimatePresence>
          {showSticky && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed left-0 right-0 z-[90] px-4 sm:px-8"
              style={{
                top: 80,
              }}
            >
              <div
                className="mx-auto flex items-center justify-between gap-3 rounded-2xl text-xs sm:text-[13px]"
                style={{
                  maxWidth: 1120,
                  background: 'var(--card-bg)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  padding: '10px 18px',
                }}
              >
                <p style={{ color: 'var(--text-secondary)' }}>
                  📊 Fees: <strong>{commissionLabel} commission</strong> + <strong>{processingLabel} processing</strong> · <strong>FREE listings</strong> · <strong>${feeSchedule.monthlyFeeUsd} monthly</strong>
                </p>
                <button
                  type="button"
                  onClick={scrollToCalculator}
                  className="hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: 'var(--gradient-brand-cta)',
                    color: 'var(--text-on-accent)',
                    boxShadow: '0 6px 18px color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                  }}
                >
                  Calculate My Earnings
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TIER 1 — Hero */}
        <section
          ref={heroRef}
          className="relative w-full overflow-hidden"
          style={{
            padding: '80px 40px',
            background:
              'var(--hero-marketing-bg)',
          }}
        >
          {/* floating blobs */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              initial={{ opacity: 0.7, y: -20 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -top-24 -left-24 rounded-full"
              style={{
                width: 260,
                height: 260,
                background: 'var(--hero-marketing-blob-c)',
                filter: 'blur(80px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.6, y: 10 }}
              animate={{ opacity: 0.9, y: -10 }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -bottom-32 -right-24 rounded-full"
              style={{
                width: 280,
                height: 280,
                background: 'var(--hero-marketing-blob-b)',
                filter: 'blur(90px)',
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-4xl text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center">
              <span
                style={{
                  background: 'var(--badge-info-bg)',
                  color: 'var(--badge-info-text)',
                  borderRadius: 999,
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                💰 Transparent Pricing
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-extrabold leading-tight" style={{ color: 'var(--hero-marketing-heading)', fontSize: 48 }}>
                Simple, Honest
              </h1>
              <h2
                className="font-extrabold leading-tight"
                style={{
                  fontSize: 48,
                  background: 'var(--hero-marketing-line2-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Seller Fees
              </h2>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: 'var(--hero-marketing-subtitle)', fontSize: 16 }}
              >
                No hidden charges. No surprises. Only pay when you make a sale.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[13px]">
              {['✓ No Monthly Fee', '✓ No Listing Fee', '✓ Pay Only on Sale'].map((label) => (
                <span
                  key={label}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--divider)',
                    borderRadius: 999,
                    padding: '6px 16px',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* TIER 2 — Stats row */}
        <section className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.08, delayChildren: 0.05 },
              },
            }}
            className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                title: '5%',
                label: 'Commission per sale',
                sub: 'Only when you earn',
                gradient: 'var(--gradient-brand-cta)',
                color: 'var(--brand-primary)',
                icon: '%',
              },
              {
                title: '1.4%',
                label: 'Payment processing',
                sub: 'Per transaction',
                gradient: 'var(--accent-marketing-gradient)',
                color: 'var(--badge-info-text)',
                icon: '💳',
              },
              {
                title: 'FREE',
                label: 'Product listings',
                sub: 'List unlimited products',
                gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
                color: 'var(--badge-success-text)',
                icon: '✓',
              },
              {
                title: '$0',
                label: 'Monthly subscription',
                sub: 'No recurring charges',
                gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                color: '#a78bfa',
                icon: '🚫',
              },
            ].map((card) => (
              <motion.div
                key={card.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="rounded-[20px] text-center"
                style={{
                  background: 'var(--card-bg)',
                  padding: '24px 28px',
                  boxShadow:
                    'var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    background: card.gradient,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  }}
                >
                  <span
                    className="text-lg"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {card.icon}
                  </span>
                </div>
                <p
                  className="text-3xl font-extrabold"
                  style={{ color: card.color }}
                >
                  {card.title}
                </p>
                <p
                  className="mt-1 text-[13px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {card.label}
                </p>
                <p
                  className="mt-1 text-[12px]"
                  style={{ color: 'var(--text-faint)' }}
                >
                  {card.sub}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* MAIN BODY */}
        <main className="w-full px-4 pt-12 pb-16 sm:px-6 lg:px-10 space-y-12">
          {/* TIER 3 — Fee breakdown table */}
          <section className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>📊</span>
                <span>Complete Fee Breakdown</span>
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Everything you need to know about selling on Spacilly.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden rounded-[24px]"
              style={{
                background: 'var(--card-bg)',
                boxShadow:
                  'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div
                className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4 text-[11px] uppercase tracking-[0.08em]"
                style={{
                  background:
                    'var(--panel-deep-bg)',
                  padding: '18px 28px',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Fee Type</span>
                <span>Amount</span>
                <span>When Charged</span>
                <span>Notes</span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  {/* Row 1 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'var(--gradient-brand-cta)',
                        }}
                      >
                        <span className="text-sm">💰</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Commission Fee
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Primary platform fee
                        </p>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[18px] font-bold"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        5%
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        of sale price
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        On successful sale
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-success-bg)',
                          color: 'var(--badge-success-text)',
                        }}
                      >
                        After delivery
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Deducted automatically from payout. You always see the final net amount.
                      </p>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'var(--accent-marketing-gradient)',
                        }}
                      >
                        <span className="text-sm">💳</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Payment Processing
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Flutterwave gateway fee
                        </p>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[18px] font-bold"
                        style={{ color: 'var(--badge-info-text)' }}
                      >
                        1.4%
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        of transaction
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        On payment received
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-warning-bg)',
                          color: 'var(--badge-warning-text)',
                        }}
                      >
                        Per transaction
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Applied to all payment methods including cards, mobile money and bank transfers.
                      </p>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'linear-gradient(135deg,#22c55e,#16a34a)',
                        }}
                      >
                        <span className="text-sm">🛡️</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Escrow Protection
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Buyer protection service
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p
                        className="text-[18px] font-bold"
                        style={{ color: 'var(--badge-success-text)' }}
                      >
                        $0.00
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-success-bg)',
                          color: 'var(--badge-success-text)',
                        }}
                      >
                        FREE
                      </span>
                      <p
                        className="text-[12px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Paid by buyer
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Charged to buyer only
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--bg-badge)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Not seller cost
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Spacilly handles escrow and buyer protection at no cost to you as the seller.
                      </p>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                        }}
                      >
                        <span className="text-sm">📦</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Product Listing
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Adding products to store
                        </p>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[18px] font-bold"
                        style={{ color: 'var(--badge-success-text)' }}
                      >
                        FREE
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Never
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-success-bg)',
                          color: 'var(--badge-success-text)',
                        }}
                      >
                        Always free
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        List unlimited products at no cost. You only pay when those products sell.
                      </p>
                    </div>
                  </div>

                  {/* Row 5 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'linear-gradient(135deg,#fbbf24,var(--brand-primary))',
                        }}
                      >
                        <span className="text-sm">📅</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Monthly Subscription
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Platform access fee
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p
                        className="text-[18px] font-bold"
                        style={{ color: 'var(--badge-success-text)' }}
                      >
                        $0
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-success-bg)',
                          color: 'var(--badge-success-text)',
                        }}
                      >
                        No charge
                      </span>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Never charged
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Free forever. No plans, no subscriptions. Upgrade tiers only when you choose.
                      </p>
                    </div>
                  </div>

                  {/* Row 6 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'var(--accent-marketing-gradient)',
                        }}
                      >
                        <span className="text-sm">🏦</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Withdrawal Fee
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Payout to bank/mobile
                        </p>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[16px] font-bold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        0.5% + $0.30
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        On withdrawal request
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-warning-bg)',
                          color: 'var(--badge-warning-text)',
                        }}
                      >
                        Per payout
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Minimum withdrawal: $10. Mobile money withdrawals: 0.3% + $0.10 per payout.
                      </p>
                    </div>
                  </div>

                  {/* Row 7 */}
                  <div
                    className="grid grid-cols-[1.4fr_0.9fr_1fr_1.2fr] gap-4"
                    style={{
                      padding: '20px 28px',
                      boxShadow: '0 1px 0 var(--divider)',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background:
                            'linear-gradient(135deg,#f97373,#ef4444)',
                        }}
                      >
                        <span className="text-sm">⚖️</span>
                      </div>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Dispute Fee
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          If dispute raised against you
                        </p>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[16px] font-bold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        $2.00 flat
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Only if you lose dispute
                      </p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: 'var(--badge-error-bg)',
                          color: 'var(--badge-error-text)',
                        }}
                      >
                        Conditional
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Only charged if Spacilly support finds the seller at fault after investigation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex flex-col gap-2 text-[13px] md:flex-row md:items-center md:justify-between"
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '16px 28px',
                }}
              >
                <p style={{ color: 'var(--text-muted)' }}>
                  💡 All fees are automatically deducted from your payout. You always receive the net amount.
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-faint)' }}
                >
                  Last updated: January 2026
                </p>
              </div>
            </motion.div>
          </section>

          {/* TIER 4 — Fee calculator */}
          <section ref={calculatorRef} className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>🧮</span>
                <span>Fee Calculator</span>
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                See exactly what you&apos;ll earn from every sale.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="rounded-[24px]"
              style={{
                background:
                  'var(--panel-deep-bg)',
                padding: 36,
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left inputs */}
                <div className="space-y-6">
                  <div>
                    <p
                      className="mb-2 text-sm font-semibold uppercase tracking-[0.08em]"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      Product Sale Price
                    </p>
                    <div
                      className="flex items-center"
                      style={{
                        height: 64,
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.08)',
                        paddingInline: 20,
                        boxShadow: '0 0 0 1px rgba(148,163,184,0.25)',
                      }}
                    >
                      <span
                        className="mr-2"
                        style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: 26,
                          fontWeight: 600,
                        }}
                      >
                        $
                      </span>
                      <input
                        type="text"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent outline-none"
                        style={{
                          color: '#ffffff',
                          fontSize: 28,
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-2">
                      <p
                        className="text-xs font-semibold uppercase tracking-[0.08em]"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        Quantity
                      </p>
                      <div className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-white text-sm gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(-1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-lg"
                        >
                          −
                        </button>
                        <span className="min-w-[40px] text-center">
                          × {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p
                      className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      Payment Method
                    </p>
                    <div className="space-y-2">
                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as PaymentMethodKey)
                        }
                        className="w-full rounded-[14px] border-none bg-[rgba(15,23,42,0.85)] px-4 py-3 text-sm outline-none"
                        style={{
                          color: '#ffffff',
                          boxShadow:
                            '0 0 0 1px rgba(148,163,184,0.35)',
                        }}
                      >
                        {paymentMethods.map((m) => (
                          <option
                            key={m.key}
                            value={m.key}
                            style={{ color: '#0f172a' }}
                          >
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.6)' }}
                      >
                        {paymentMethods.find((m) => m.key === paymentMethod)
                          ?.description || ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right results */}
                <div className="space-y-4">
                  <div
                    className="rounded-[20px]"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: 28,
                    }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Sale Price
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: '#ffffff' }}
                      >
                        {formatMoney(animatedSaleTotal)}
                      </span>
                    </div>

                    <div
                      className="my-3 h-px"
                      style={{
                        background:
                          'linear-gradient(to right, transparent, rgba(148,163,184,0.6), transparent)',
                      }}
                    />

                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Platform Commission ({commissionLabel})
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: 'var(--brand-orange-text)', fontSize: 15 }}
                      >
                        − {formatMoney(animatedCommission)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Payment Processing (1.4%)
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: '#fdba74', fontSize: 15 }}
                      >
                        − {formatMoney(animatedProcessing)}
                      </span>
                    </div>

                    <div
                      className="my-4 h-px"
                      style={{
                        background:
                          'linear-gradient(to right, transparent, rgba(15,23,42,0.9), transparent)',
                      }}
                    />

                    <p
                      className="text-[12px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      You Receive:
                    </p>
                    <p
                      className="mt-1 font-black leading-tight"
                      style={{
                        color: 'var(--badge-success-text)',
                        fontSize: 44,
                      }}
                    >
                      {formatMoney(animatedPayout)}
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                    >
                      You keep{' '}
                      <strong>
                        {animatedKeepPercent.toFixed(1)}%
                      </strong>{' '}
                      of every sale.
                    </p>

                    <div className="mt-4 space-y-1 text-xs">
                      <p style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Selling 10 items/month:
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--brand-orange-text)' }}
                      >
                        Est. Monthly Earnings:{' '}
                        {formatMoney(animatedMonthly)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToCalculator()}
                    className="mt-2 w-full rounded-[16px] py-3 text-sm font-bold"
                    style={{
                      background:
                        'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-hover),#c2410c)',
                      color: '#ffffff',
                      boxShadow: '0 10px 28px color-mix(in srgb, var(--brand-primary) 50%, transparent)',
                    }}
                  >
                    Start Selling Today →
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          {/* TIER 5 — Seller tiers */}
          <section className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>📋</span>
                <span>Seller Tiers</span>
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                All tiers are FREE — earn more as you grow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Starter */}
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="rounded-[24px] p-8"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="mb-5 space-y-3 text-center">
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg,#22c55e,#16a34a)',
                    }}
                  >
                    <span className="text-3xl">🌱</span>
                  </div>
                  <h3
                    className="text-[22px] font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Starter
                  </h3>
                  <p
                    className="text-[28px] font-extrabold"
                    style={{ color: 'var(--badge-success-text)' }}
                  >
                    $0<span className="text-sm font-semibold">/month</span>
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Free forever
                  </p>
                </div>
                <ul
                  className="mb-6 space-y-1.5 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {[
                    '✓ Up to 50 products',
                    '✓ Basic analytics',
                    '✓ Standard support',
                    '✓ 5% commission',
                    '✓ Spacilly badge',
                    '✗ Priority listing',
                    '✗ Featured store',
                    '✗ Bulk upload',
                    '✗ Advanced analytics',
                  ].map((line) => (
                    <li
                      key={line}
                      style={{
                        opacity: line.startsWith('✗') ? 0.6 : 1,
                      }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full rounded-[999px] py-2.5 text-sm font-semibold"
                  style={{
                    color: 'var(--badge-success-text)',
                    boxShadow:
                      '0 0 0 1px color-mix(in srgb, var(--badge-success-text) 40%, transparent)',
                    background: 'transparent',
                  }}
                >
                  Current Plan
                </button>
              </motion.div>

              {/* Growth */}
              <motion.div
                whileHover={{ y: -6 }}
                animate={{ y: [0, -3, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: 'mirror',
                }}
                className="rounded-[24px] p-8 relative overflow-hidden"
                style={{
                  background:
                    'var(--panel-deep-bg)',
                  boxShadow:
                    'var(--shadow-xl), 0 0 0 2px color-mix(in srgb, var(--brand-primary) 40%, transparent)',
                  transform: 'scale(1.02)',
                }}
              >
                <div className="mb-4 flex justify-center">
                  <span
                    className="inline-flex items-center rounded-full px-4 py-1 text-xs font-bold"
                    style={{
                      background: 'var(--brand-primary)',
                      color: '#ffffff',
                    }}
                  >
                    MOST POPULAR
                  </span>
                </div>
                <div className="mb-5 space-y-3 text-center">
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background:
                        'var(--gradient-brand-cta)',
                    }}
                  >
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h3
                    className="text-[22px] font-bold"
                    style={{ color: '#ffffff' }}
                  >
                    Growth
                  </h3>
                  <p
                    className="text-[28px] font-extrabold"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    $9.99<span className="text-sm font-semibold">/month</span>
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Billed monthly
                  </p>
                </div>
                <ul
                  className="mb-6 space-y-1.5 text-sm"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {[
                    '✓ Unlimited products',
                    '✓ Advanced analytics',
                    '✓ Priority support',
                    '✓ 4% commission (save 1%)',
                    '✓ Spacilly Pro badge',
                    '✓ Priority listing',
                    '✓ Featured store placement',
                    '✓ Bulk upload (CSV)',
                    '✓ Custom store URL',
                  ].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full rounded-[16px] py-3 text-sm font-bold"
                  style={{
                    background:
                      'var(--gradient-brand-cta)',
                    color: '#ffffff',
                    boxShadow:
                      '0 10px 30px color-mix(in srgb, var(--brand-primary) 55%, transparent)',
                  }}
                >
                  Upgrade to Growth
                </button>
              </motion.div>

              {/* Enterprise */}
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="rounded-[24px] p-8"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="mb-5 space-y-3 text-center">
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                    }}
                  >
                    <span className="text-3xl">🏢</span>
                  </div>
                  <h3
                    className="text-[22px] font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Enterprise
                  </h3>
                  <p
                    className="text-[22px] font-extrabold"
                    style={{ color: '#a78bfa' }}
                  >
                    Custom pricing
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Contact us
                  </p>
                </div>
                <ul
                  className="mb-6 space-y-1.5 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {[
                    '✓ Everything in Growth',
                    '✓ 3% commission (save 2%)',
                    '✓ Dedicated account manager',
                    '✓ Custom integrations',
                    '✓ API access',
                    '✓ White-label options',
                    '✓ Volume discounts',
                    '✓ SLA guarantee',
                  ].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full rounded-[16px] py-3 text-sm font-bold"
                  style={{
                    background:
                      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                    color: '#ffffff',
                  }}
                >
                  Contact Sales →
                </button>
              </motion.div>
            </div>
          </section>

          {/* TIER 6 — Payout information */}
          <section className="space-y-6">
            <h2
              className="text-2xl md:text-[26px] font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>💸</span>
              <span>How Payouts Work</span>
            </h2>

            <div className="relative">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  {
                    step: 1,
                    emoji: '🛒',
                    title: 'Buyer Purchases',
                    desc: 'Customer pays, funds held in escrow.',
                    gradient: 'var(--gradient-brand-cta)',
                  },
                  {
                    step: 2,
                    emoji: '📦',
                    title: 'You Ship Item',
                    desc: 'Ship within 2 days and update tracking.',
                    gradient: 'var(--accent-marketing-gradient)',
                  },
                  {
                    step: 3,
                    emoji: '✓',
                    title: 'Buyer Confirms',
                    desc: 'Buyer confirms receipt, funds released.',
                    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
                  },
                  {
                    step: 4,
                    emoji: '💰',
                    title: 'You Get Paid',
                    desc: 'Net amount deposited within 24 hours.',
                    gradient: 'var(--gradient-brand-cta)',
                  },
                ].map((s, idx) => (
                  <motion.div
                    key={s.step}
                    whileInView={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 12 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: 0.05 * idx }}
                    className="relative flex flex-col items-center rounded-[20px] p-6 text-center"
                    style={{
                      background: 'var(--card-bg)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div
                      className="mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        background: s.gradient,
                        color: '#ffffff',
                        boxShadow:
                          '0 0 0 6px color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                      }}
                    >
                      {s.step}
                    </div>
                    <div className="mb-1 text-3xl">{s.emoji}</div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {s.title}
                    </p>
                    <p
                      className="mt-1 text-[13px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {s.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div
              className="mt-6 rounded-[20px] p-7"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3
                className="mb-4 text-lg font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                💳 Payout Methods
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: '📱 MTN Mobile Money',
                    fee: '0.3% + $0.10',
                    note: 'Instant',
                  },
                  {
                    label: '📱 Airtel Money',
                    fee: '0.3% + $0.10',
                    note: 'Instant',
                  },
                  {
                    label: '🏦 Bank Transfer (Rwanda)',
                    fee: '$0.50 flat',
                    note: '1–2 days',
                  },
                  {
                    label: '🌍 Bank Transfer (International)',
                    fee: '1% + $2.00',
                    note: '3–5 days',
                  },
                  {
                    label: '💳 Visa/Mastercard',
                    fee: '0.5% + $0.30',
                    note: '1–3 days',
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-[14px] p-4 transition-transform"
                    style={{
                      background: 'var(--bg-secondary)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {m.label}
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {m.fee}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {m.note}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 rounded-[16px] p-5"
                style={{
                  background: 'var(--brand-tint)',
                  boxShadow:
                    'inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 25%, transparent)',
                }}
              >
                <p
                  className="mb-1 text-sm font-semibold"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  ⚡ Payout Schedule
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Payouts are processed every Tuesday and Friday. Minimum payout: $10.00. Earnings below $10 roll over to the next payout cycle.
                </p>
              </div>
            </div>
          </section>

          {/* TIER 7 — FAQ */}
          <section className="space-y-6">
            <h2
              className="text-2xl md:text-[26px] font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>❓</span>
              <span>Frequently Asked Questions</span>
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {[faqItems.slice(0, 5), faqItems.slice(5)].map((column, colIdx) => (
                <div key={colIdx} className="space-y-3">
                  {column.map((item) => {
                    const open = openFaqId === item.id;
                    return (
                      <motion.div
                        key={item.id}
                        initial={false}
                        animate={{
                          backgroundColor: open
                            ? 'var(--bg-secondary)'
                            : 'var(--card-bg)',
                          boxShadow: open
                            ? 'var(--shadow-md)'
                            : 'var(--shadow-sm)',
                        }}
                        className="cursor-pointer rounded-[16px]"
                        onClick={() =>
                          setOpenFaqId((prev) =>
                            prev === item.id ? null : item.id,
                          )
                        }
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'inherit',
                          }}
                        >
                          <span
                            className="text-[15px] font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.q}
                          </span>
                          <motion.span
                            animate={{ rotate: open ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <div className="px-5 pb-4">
                                <div
                                  className="mb-3 h-px"
                                  style={{
                                    background:
                                      'linear-gradient(to right, transparent, rgba(148,163,184,0.6), transparent)',
                                  }}
                                />
                                <p
                                  className="text-[14px] leading-relaxed"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {item.a}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {/* TIER 8 — Bottom CTA */}
          <section className="pt-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45 }}
              className="rounded-[24px] px-6 py-10 sm:px-10"
              style={{
                background:
                  'linear-gradient(135deg,var(--brand-primary) 0%,var(--brand-primary-hover) 50%,#c2410c 100%)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
              }}
            >
              <div className="relative mx-auto max-w-4xl text-center space-y-5">
                <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern
                        id="fees-cta-dots"
                        width="12"
                        height="12"
                        patternUnits="userSpaceOnUse"
                      >
                        <circle cx="1.5" cy="1.5" r="0.8" fill="white" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#fees-cta-dots)" />
                  </svg>
                </div>

                <div className="relative space-y-3">
                  <h2
                    className="text-[30px] sm:text-[36px] font-extrabold"
                    style={{ color: '#ffffff' }}
                  >
                    🚀 Ready to Start Selling?
                  </h2>
                  <p
                    className="mx-auto max-w-2xl text-sm sm:text-base"
                    style={{ color: 'rgba(255,255,255,0.80)' }}
                  >
                    Join 10,000+ sellers already earning on Spacilly. Zero monthly fees. Start today.
                  </p>
                </div>

                <div className="relative mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    className="w-full rounded-[14px] px-8 py-3 text-sm font-bold sm:w-auto"
                    style={{
                      background: 'var(--text-on-accent)',
                      color: 'var(--brand-primary)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    Start Selling Free →
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-[14px] px-8 py-3 text-sm font-bold sm:w-auto"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      color: 'var(--text-on-accent)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    View Seller Dashboard →
                  </button>
                </div>

                <p
                  className="relative text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  ✓ No credit card required
                  <span className="mx-1 opacity-60">·</span>
                  ✓ Free to join
                  <span className="mx-1 opacity-60">·</span>
                  ✓ Cancel anytime
                </p>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </BuyerLayout>
  );
}

