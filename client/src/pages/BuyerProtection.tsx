import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore BuyerLayout is a JSX component without TS typings
import BuyerLayout from '../components/buyer/BuyerLayout';

const PROTECTION_STATS = [
  {
    title: '$2.4M+',
    label: 'Buyer funds protected',
    sub: 'This year',
    icon: '💰',
    color: '#34d399',
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
  },
  {
    title: '94%',
    label: "Disputes resolved for buyer",
    sub: "In buyer's favor",
    icon: '⚖️',
    color: '#60a5fa',
    gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  },
  {
    title: '3,891',
    label: 'Refunds processed',
    sub: 'Last 90 days',
    icon: '💸',
    color: '#f97316',
    gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
  },
  {
    title: '< 48hrs',
    label: 'Dispute resolution',
    sub: 'Average time',
    icon: '⚡',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  },
];

const HOW_STEPS = [
  {
    num: 1,
    icon: '🛒',
    title: 'Browse & Purchase',
    desc: 'Find what you love and place your order. Pay securely through Reaglex.',
    badge: 'SSL Encrypted',
    gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
  },
  {
    num: 2,
    icon: '🔒',
    title: 'Funds in Escrow',
    desc: 'Your payment is held safely in our escrow system. The seller cannot access it yet.',
    badge: 'Escrow Protected',
    gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  },
  {
    num: 3,
    icon: '📦',
    title: 'Seller Fulfills Order',
    desc: 'Seller ships your item with tracking. You get real-time updates on your order.',
    badge: 'Tracked Shipping',
    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  },
  {
    num: 4,
    icon: '✓',
    title: 'You Verify Receipt',
    desc: 'Receive your item and confirm everything is as described. You’re satisfied!',
    badge: 'Buyer Verified',
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
  },
  {
    num: 5,
    icon: '💰',
    title: 'Seller Gets Paid',
    desc: 'Only after your confirmation, funds are released to seller. Everyone wins!',
    badge: 'Transaction Complete',
    gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alice M.',
    location: 'Kigali',
    refunded: '$89 Refunded',
    quote:
      'I ordered a phone but received a completely different model. I opened a dispute and within 24 hours Reaglex refunded me fully. Amazing protection!',
  },
  {
    name: 'Jean P.',
    location: 'Musanze',
    refunded: '$45 Refunded',
    quote:
      'The seller never shipped my order. Reaglex investigated and refunded me the same day I filed. Incredible!',
  },
  {
    name: 'Grace N.',
    location: 'Butare',
    refunded: '$120 Refunded',
    quote:
      'Received a fake branded bag. Sent photos as evidence and Reaglex confirmed it was fake. Full refund plus the seller was removed from the platform!',
  },
  {
    name: 'Eric T.',
    location: 'Kigali',
    refunded: '$38 Refunded',
    quote:
      'Wrong size shoes arrived. Opened dispute with photos and got a full refund — and I even got to keep the shoes. Wow!',
  },
];

const FAQ_ITEMS = [
  {
    id: 'duration',
    q: 'How long does buyer protection last?',
    a: 'Protection is active for 30 days from the confirmed delivery date. Enhanced members get 45 days and Premium members get 60 days.',
  },
  {
    id: 'auto',
    q: 'Do I need to do anything to be protected?',
    a: 'No. All buyers are automatically protected from the moment they checkout. There is no extra registration or fee required.',
  },
  {
    id: 'rejected',
    q: 'What if my dispute is rejected?',
    a: 'You have the right to appeal within 7 days. Our senior team will conduct a full review and issue a final decision.',
  },
  {
    id: 'refund-time',
    q: 'How long do refunds take?',
    a: 'Standard: 3–5 business days. Enhanced: 1–3 days. Premium: same‑day processing. Mobile money refunds are usually instant.',
  },
  {
    id: 'after-30',
    q: 'Can I open a dispute after 30 days?',
    a: 'In most cases no. We strongly recommend opening a dispute as soon as you notice a problem. Contact support for rare exceptions.',
  },
  {
    id: 'evidence',
    q: 'What evidence do I need?',
    a: 'Photos of the received item, screenshots of seller communications, the original product listing and tracking information. More evidence means faster resolutions.',
  },
  {
    id: 'notify-seller',
    q: 'Will the seller know I filed a dispute?',
    a: 'Yes, sellers are notified of disputes and given a chance to respond. This is part of our fair process for both sides.',
  },
  {
    id: 'seller-disagrees',
    q: 'What if the seller disagrees?',
    a: 'Both parties present their case. Our team reviews all evidence and makes an impartial final decision based on facts and policies.',
  },
  {
    id: 'payment-method',
    q: 'Is my payment method refunded?',
    a: 'Yes. Refunds go back to your original payment method. Mobile money refunds are usually instant once processed.',
  },
  {
    id: 'seller-abuse',
    q: 'Can sellers abuse the system?',
    a: 'Sellers found to be dishonest face account suspension or permanent ban. We protect buyers aggressively and keep repeat offenders off the platform.',
  },
];

function BuyerProtection() {
  const [heroReady, setHeroReady] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setCarouselIndex((prev) => (prev + 1) % TESTIMONIALS.length),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  const visibleTestimonials = useMemo(() => {
    const items: typeof TESTIMONIALS = [];
    for (let i = 0; i < 3; i += 1) {
      items.push(TESTIMONIALS[(carouselIndex + i) % TESTIMONIALS.length]);
    }
    return items;
  }, [carouselIndex]);

  return (
    <BuyerLayout>
      <div className="w-full" style={{ color: 'var(--text-primary)' }}>
        {/* HERO */}
        <section
          className="relative w-full overflow-hidden"
          style={{
            padding: '80px 40px',
            background:
              'linear-gradient(135deg,#0f0c24 0%, #1a0f3a 40%, #0d1f3a 70%, #0a1628 100%)',
          }}
        >
          {/* floating blobs */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              initial={{ opacity: 0.7, y: -20 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -top-32 -left-32 rounded-full"
              style={{
                width: 260,
                height: 260,
                background: 'rgba(52,211,153,0.18)',
                filter: 'blur(90px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.6, y: 10 }}
              animate={{ opacity: 0.9, y: -10 }}
              transition={{ duration: 1.8, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute -bottom-40 -right-24 rounded-full"
              style={{
                width: 280,
                height: 280,
                background: 'rgba(249,115,22,0.16)',
                filter: 'blur(90px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0.4, x: -10 }}
              animate={{ opacity: 0.8, x: 10 }}
              transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute inset-y-1/4 left-1/2 rounded-full"
              style={{
                width: 220,
                height: 220,
                background: 'rgba(96,165,250,0.20)',
                filter: 'blur(80px)',
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroReady ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-4xl text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center">
              <span
                style={{
                  background: 'rgba(52,211,153,0.15)',
                  color: '#34d399',
                  borderRadius: 999,
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                🛡️ 100% Protected
              </span>
            </div>

            <div className="space-y-3">
              <h1
                className="font-extrabold leading-tight"
                style={{ color: '#ffffff', fontSize: 48 }}
              >
                Shop With Complete
              </h1>
              <p
                className="font-extrabold leading-tight"
                style={{
                  fontSize: 40,
                  background: 'linear-gradient(135deg,#34d399,#10b981)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Confidence &amp; Peace of Mind
              </p>
              <p
                className="mx-auto max-w-xl text-base"
                style={{ color: 'rgba(255,255,255,0.60)', fontSize: 16 }}
              >
                Every purchase on Reaglex is backed by our comprehensive Buyer Protection
                program. Your money is always safe.
              </p>
            </div>

            {/* Shield animation */}
            <motion.div
              className="mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-[36px]"
              style={{
                background: 'linear-gradient(135deg,#059669,#047857)',
                boxShadow: '0 0 60px rgba(52,211,153,0.40)',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-5xl text-white">🛡️</span>
            </motion.div>

            <div className="mt-6 flex flex-wrap justify-center gap-3 text-[13px]">
              {['✓ Escrow Protected', '✓ Full Refund Guarantee', '✓ 30-Day Returns'].map(
                (label) => (
                  <span
                    key={label}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.85)',
                      borderRadius: 999,
                      padding: '6px 16px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    {label}
                  </span>
                ),
              )}
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
            {PROTECTION_STATS.map((card) => (
              <motion.div
                key={card.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="rounded-[20px] text-center"
                style={{
                  background: 'var(--card-bg)',
                  padding: 24,
                  boxShadow:
                    'var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: card.gradient }}
                >
                  <span className="text-lg text-white">{card.icon}</span>
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

        {/* BODY */}
        <main className="w-full px-4 pt-12 pb-16 sm:px-6 lg:px-10 space-y-12">
          {/* TIER 3 — What is Buyer Protection */}
          <section className="space-y-6">
            <h2
              className="text-center text-2xl md:text-[26px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              🛡️ What is Buyer Protection?
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="mx-auto grid max-w-6xl gap-8 rounded-[24px] px-6 py-10 md:grid-cols-[1.2fr_1fr]"
              style={{
                background: 'linear-gradient(145deg,#1a0f3a 0%,#0d1f3a 100%)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div className="space-y-4">
                <p
                  className="text-base"
                  style={{ color: 'rgba(255,255,255,0.80)', lineHeight: 1.8 }}
                >
                  Reaglex Buyer Protection is our commitment to every shopper on our
                  platform.
                </p>
                <p
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.70)', lineHeight: 1.8 }}
                >
                  When you shop on Reaglex, your payment is held securely in escrow — never
                  sent directly to the seller until you confirm you&apos;re satisfied.
                </p>
                <p
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.70)', lineHeight: 1.8 }}
                >
                  If anything goes wrong — wrong item, damaged product, seller doesn&apos;t
                  ship — we step in to protect your money.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      title: 'Your payment is held in escrow',
                      desc: 'Not released until you confirm.',
                    },
                    {
                      title: 'Verified sellers only',
                      desc: 'Every seller is identity verified.',
                    },
                    {
                      title: '24/7 dispute support',
                      desc: 'Our team is always available.',
                    },
                    {
                      title: 'Full refund guarantee',
                      desc: 'Get 100% back if unprotected.',
                    },
                  ].map((p) => (
                    <div key={p.title} className="flex gap-3 text-sm">
                      <div
                        className="mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                        style={{
                          background: 'rgba(16,185,129,0.18)',
                          color: '#22c55e',
                        }}
                      >
                        ✓
                      </div>
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: '#ffffff' }}
                        >
                          {p.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'rgba(226,232,240,0.80)' }}
                        >
                          {p.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="relative w-full max-w-xs">
                  {/* stacked glass cards */}
                  <div
                    className="absolute inset-x-6 top-10 rounded-2xl px-4 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(14px)',
                      boxShadow: '0 10px 30px rgba(15,23,42,0.65)',
                      transform: 'translateX(16px)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'rgba(248,250,252,0.90)' }}
                    >
                      🔒 Escrow Lock
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: 'rgba(226,232,240,0.80)' }}
                    >
                      Funds held safely until you confirm delivery.
                    </p>
                  </div>
                  <div
                    className="absolute inset-x-3 top-0 rounded-2xl px-4 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(14px)',
                      boxShadow: '0 16px 40px rgba(15,23,42,0.75)',
                      transform: 'translateX(-8px)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'rgba(248,250,252,0.90)' }}
                    >
                      🧾 Order #ORD-1024
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: 'rgba(226,232,240,0.80)' }}
                    >
                      Noise Cancelling Headphones
                    </p>
                    <p
                      className="mt-1 text-sm font-bold"
                      style={{ color: '#22c55e' }}
                    >
                      $129.00
                    </p>
                  </div>
                  <div
                    className="absolute inset-x-10 top-24 rounded-2xl px-4 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(14px)',
                      boxShadow: '0 10px 30px rgba(15,23,42,0.65)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'rgba(248,250,252,0.90)' }}
                    >
                      ✅ Refund Guarantee
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: 'rgba(226,232,240,0.80)' }}
                    >
                      Full refund if your order is not as described.
                    </p>
                  </div>
                  {/* floating shield */}
                  <motion.div
                    className="absolute left-1/2 top-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-2xl"
                    style={{
                      background:
                        'linear-gradient(135deg,#22c55e,#16a34a)',
                      boxShadow: '0 0 30px rgba(34,197,94,0.6)',
                    }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="text-3xl text-white">🛡️</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* TIER 4 — How protection works */}
          <section className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                ⚙️ How Buyer Protection Works
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Step by step — from purchase to protection.
              </p>
            </div>
            <div className="relative">
              <div className="hidden gap-4 md:grid md:grid-cols-5">
                {HOW_STEPS.map((step, idx) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                    className="relative rounded-[20px] p-5 text-center"
                    style={{
                      background: 'var(--card-bg)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <div
                      className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: step.gradient,
                        color: '#ffffff',
                        boxShadow: '0 0 16px rgba(249,115,22,0.45)',
                      }}
                    >
                      {step.num}
                    </div>
                    <div
                      className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      {step.icon}
                    </div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {step.desc}
                    </p>
                    <span
                      className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{
                        background: 'rgba(16,185,129,0.12)',
                        color: '#22c55e',
                      }}
                    >
                      {step.badge}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Problem branch */}
              <div
                className="mt-4 rounded-[12px] px-4 py-3 text-sm md:mt-6"
                style={{
                  background: 'rgba(249,115,22,0.08)',
                  color: '#f97316',
                }}
              >
                ⚠️ Problem with order?{' '}
                <span className="font-semibold">
                  Open a dispute — we step in to protect you.
                </span>
              </div>
            </div>
          </section>

          {/* TIER 5 — Protection coverage */}
          <section className="space-y-6">
            <h2
              className="text-2xl md:text-[26px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              ✅ What&apos;s Covered
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* covered */}
              <div
                className="rounded-[20px] p-8"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                    style={{
                      background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    }}
                  >
                    🛡️
                  </div>
                  <div>
                    <p
                      className="text-base font-bold"
                      style={{ color: '#34d399' }}
                    >
                      ✅ Covered by Protection
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      You&apos;re eligible for a full refund.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    [
                      'Item not received',
                      "Seller didn't ship within the promised timeframe.",
                    ],
                    [
                      'Item significantly different',
                      "Product doesn't match description or photos.",
                    ],
                    [
                      'Counterfeit or fake item',
                      'Item is not the advertised brand or authenticity.',
                    ],
                    [
                      'Damaged in transit',
                      'Item arrived broken, scratched or otherwise damaged.',
                    ],
                    [
                      'Wrong item received',
                      'You received a completely different product.',
                    ],
                    [
                      'Seller fraud',
                      'Seller attempted to scam you or refuses to cooperate.',
                    ],
                    [
                      'Unauthorized transaction',
                      'Payment made without your consent.',
                    ],
                    [
                      'Duplicate charge',
                      'You were charged more than once for the same order.',
                    ],
                    [
                      'Cancelled order not refunded',
                      'Seller cancelled but kept or delayed your refund.',
                    ],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-3">
                      <div
                        className="mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                        style={{
                          background: 'rgba(34,197,94,0.18)',
                          color: '#22c55e',
                        }}
                      >
                        ✓
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* not covered */}
              <div
                className="rounded-[20px] p-8"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                    style={{
                      background: 'linear-gradient(135deg,#4b5563,#1f2937)',
                    }}
                  >
                    ❌
                  </div>
                  <div>
                    <p
                      className="text-base font-bold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Not Covered
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      These fall outside our protection scope.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    [
                      'Change of mind',
                      "Simply deciding you don't want the item anymore.",
                    ],
                    [
                      'Buyer-caused damage',
                      'Item damaged after delivery while in your care.',
                    ],
                    [
                      'Digital products after download',
                      'Once the content has been downloaded or accessed.',
                    ],
                    [
                      'Prohibited items',
                      'Purchases of items banned by Reaglex policy.',
                    ],
                    [
                      'Transactions off-platform',
                      'Deals made outside Reaglex or paid off-site.',
                    ],
                    [
                      'Claims after 30 days',
                      'Disputes filed after the protection window.',
                    ],
                    [
                      'Service-only purchases',
                      'Freelance work, consultations or non-physical services.',
                    ],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-3">
                      <div
                        className="mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                        style={{
                          background: 'rgba(148,163,184,0.25)',
                          color: '#6b7280',
                        }}
                      >
                        ✗
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-4 rounded-[12px] px-4 py-3 text-xs"
                  style={{
                    background: '#060f22',
                    boxShadow: 'inset 0 0 0 1px rgba(96,165,250,0.25)',
                    color: '#60a5fa',
                  }}
                >
                  💡 Still have questions about coverage? Contact our support team
                  before purchasing.
                </div>
              </div>
            </div>
          </section>

          {/* TIER 6 — Escrow explanation */}
          <section className="space-y-6">
            <h2
              className="text-2xl md:text-[26px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              🔐 Understanding Escrow
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="rounded-[24px] p-8"
              style={{
                background: 'linear-gradient(145deg,#0a1628,#0d1f3a)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div
                      className="rounded-[14px] px-4 py-3"
                      style={{ background: 'rgba(15,23,42,0.8)' }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: '#e5e7eb' }}
                      >
                        You (Buyer)
                      </p>
                      <p
                        className="mt-1 text-[11px]"
                        style={{ color: '#a5b4fc' }}
                      >
                        $29.00 payment
                      </p>
                    </div>
                    <div className="hidden text-2xl text-emerald-400 lg:block">➝</div>
                    <div
                      className="rounded-[16px] px-5 py-4 text-center"
                      style={{ background: 'rgba(15,23,42,0.9)' }}
                    >
                      <p
                        className="text-sm font-bold"
                        style={{ color: '#e5e7eb' }}
                      >
                        Reaglex Escrow
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: '#cbd5f5' }}
                      >
                        Funds held safely
                      </p>
                      <span
                        className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{
                          background: 'rgba(34,197,94,0.18)',
                          color: '#22c55e',
                        }}
                      >
                        Bank-level security
                      </span>
                    </div>
                    <div className="hidden text-2xl text-emerald-400 lg:block">➝</div>
                    <div
                      className="rounded-[14px] px-4 py-3 text-right"
                      style={{ background: 'rgba(15,23,42,0.8)' }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: '#e5e7eb' }}
                      >
                        Seller
                      </p>
                      <p
                        className="mt-1 text-[11px]"
                        style={{ color: '#a5b4fc' }}
                      >
                        Receives payment
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      [
                        '🏦 Bank-Level Security',
                        'Your funds are encrypted and insured during escrow.',
                      ],
                      [
                        '⚡ Instant Hold',
                        'Payment is secured the moment you checkout.',
                      ],
                      [
                        '🔄 Automatic Release',
                        'Funds are released automatically after confirmation.',
                      ],
                      [
                        '👁️ Full Transparency',
                        'Track escrow status in your account anytime.',
                      ],
                    ].map(([t, d]) => (
                      <div
                        key={t}
                        className="rounded-[14px] p-4"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <p
                          className="text-sm font-semibold"
                          style={{ color: '#e5e7eb' }}
                        >
                          {t}
                        </p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: '#cbd5f5' }}
                        >
                          {d}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* TIER 7 — Filing a dispute */}
          <section className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                ⚖️ How to File a Dispute
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Simple steps to get your money back.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  icon: '📋',
                  title: 'Go to My Orders',
                  desc: 'Find the problematic order in your account.',
                  button: 'My Orders →',
                  to: '/account?tab=orders',
                },
                {
                  icon: '🚨',
                  title: 'Click Open Dispute',
                  desc: "Select 'Open Dispute' on the order page.",
                },
                {
                  icon: '📸',
                  title: 'Provide Evidence',
                  desc: 'Upload photos, messages or any proof.',
                },
                {
                  icon: '✓',
                  title: 'We Resolve It',
                  desc: 'Our team reviews within 24–48 hours.',
                },
              ].map((s) => (
                <div
                  key={s.title}
                  className="rounded-[20px] p-5 text-center"
                  style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-xl"
                    style={{ background: 'rgba(59,130,246,0.15)' }}
                  >
                    {s.icon}
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.title}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {s.desc}
                  </p>
                  {s.button && (
                    <Link
                      to={s.to || '/account'}
                      className="mt-3 inline-flex rounded-full px-4 py-1.5 text-xs font-semibold"
                      style={{
                        background: 'linear-gradient(135deg,#f97316,#ea580c)',
                        color: '#ffffff',
                      }}
                    >
                      {s.button}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div
              className="rounded-[16px] px-5 py-4 text-sm"
              style={{
                background: 'var(--brand-tint)',
                boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25)',
              }}
            >
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--brand-primary)' }}
              >
                💡 Dispute Tips:
              </p>
              <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {[
                  'File within 30 days of delivery.',
                  'Include photos for faster resolution.',
                  'Be specific about what’s wrong.',
                  'Keep all communication on the platform.',
                  "Don’t return items before approval.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full"
                      style={{ background: '#f97316' }}
                    />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="mt-5 rounded-[20px] px-5 py-4 text-sm"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="mb-3 flex justify-between text-xs font-semibold">
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <span style={{ color: 'var(--text-muted)' }}>Timeline</span>
                <span style={{ color: 'var(--text-muted)' }}>Outcome</span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  [
                    'Simple dispute',
                    '24–48 hours',
                    'Refund or resolution',
                  ],
                  [
                    'Evidence review',
                    '2–3 business days',
                    'Case closed with decision',
                  ],
                  [
                    'Complex investigation',
                    '5–7 business days',
                    'Full review with action',
                  ],
                  [
                    'Appeal',
                    '3–5 business days',
                    'Final decision review',
                  ],
                ].map(([type, time, outcome]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-[10px] px-3 py-2"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{type}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{time}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TIER 8 — Protection levels */}
          <section className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                ⭐ Protection Levels
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                All buyers get full protection. Verified sellers get enhanced coverage.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Standard */}
              <div
                className="rounded-[24px] p-8"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="mb-4 text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl">
                    🥉
                  </div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Standard Protection
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    All Reaglex Buyers
                  </p>
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: 'rgba(34,197,94,0.18)',
                      color: '#22c55e',
                    }}
                  >
                    FREE
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {[
                    '✓ Escrow on all purchases',
                    '✓ 30-day dispute window',
                    '✓ Full refund eligibility',
                    '✓ Fraud protection',
                    '✓ Email support',
                    '○ Priority dispute handling',
                    '○ Dedicated case manager',
                    '○ Instant refund option',
                  ].map((t) => (
                    <li
                      key={t}
                      style={{
                        color: t.startsWith('○')
                          ? 'var(--text-muted)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enhanced */}
              <motion.div
                whileHover={{ y: -4 }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, repeatType: 'mirror' }}
                className="rounded-[24px] p-8"
                style={{
                  background: 'linear-gradient(145deg,#1a0f3a,#0d1f3a)',
                  boxShadow:
                    'var(--shadow-xl), 0 0 0 2px rgba(52,211,153,0.40)',
                }}
              >
                <div className="mb-4 flex justify-center">
                  <span
                    className="inline-flex rounded-full px-4 py-1 text-xs font-semibold"
                    style={{ background: '#34d399', color: '#ffffff' }}
                  >
                    BEST PROTECTION
                  </span>
                </div>
                <div className="mb-4 text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl">
                    🥇
                  </div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: '#ffffff' }}
                  >
                    Enhanced Protection
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.70)' }}
                  >
                    Verified Sellers
                  </p>
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: 'rgba(34,197,94,0.18)',
                      color: '#22c55e',
                    }}
                  >
                    FREE
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs" style={{ color: '#e5e7eb' }}>
                  {[
                    '✓ All Standard features',
                    '✓ Priority dispute handling',
                    '✓ 45-day dispute window',
                    '✓ Dedicated case manager',
                    '✓ Live chat support',
                    '✓ Seller identity verified',
                    '✓ Product authenticity check',
                    '✓ Instant refund option',
                  ].map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </motion.div>

              {/* Premium */}
              <div
                className="rounded-[24px] p-8"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="mb-4 text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl">
                    💎
                  </div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Premium Protection
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Reaglex Pro Members
                  </p>
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: 'rgba(129,140,248,0.18)',
                      color: '#a78bfa',
                    }}
                  >
                    $4.99/mo
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {[
                    '✓ All Enhanced features',
                    '✓ 60-day dispute window',
                    '✓ Same-day refund processing',
                    '✓ VIP support line',
                    '✓ Purchase insurance',
                    '✓ Price protection guarantee',
                    '✓ Extended warranty support',
                    '✓ Identity theft protection',
                  ].map((t) => (
                    <li key={t} style={{ color: 'var(--text-secondary)' }}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* TIER 9 — Testimonials */}
          <section className="space-y-6">
            <div>
              <h2
                className="text-2xl md:text-[26px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                💬 Real Buyer Stories
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Buyers who were protected by our guarantee.
              </p>
            </div>
            <div className="overflow-hidden">
              <div className="grid gap-4 md:grid-cols-3">
                {visibleTestimonials.map((t, idx) => (
                  <motion.div
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative rounded-[20px] p-7"
                    style={{
                      background: 'var(--card-bg)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <div
                      className="pointer-events-none absolute left-5 top-1 text-6xl font-serif"
                      style={{ color: 'rgba(249,115,22,0.15)' }}
                    >
                      “
                    </div>
                    <div className="mb-2 flex gap-1 text-xs">
                      {'★★★★★'.split('').map((s) => (
                        <span key={`${t.name}-${s}`} style={{ color: '#facc15' }}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    <p
                      className="mt-1 text-sm italic"
                      style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}
                    >
                      {t.quote}
                    </p>
                    <span
                      className="mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{
                        background: 'rgba(34,197,94,0.12)',
                        color: '#22c55e',
                        boxShadow: 'inset 0 0 0 1px rgba(34,197,94,0.25)',
                      }}
                    >
                      💰 Full Refund Received — {t.refunded}
                    </span>
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg,#f97316,#fb923c)',
                          color: '#ffffff',
                        }}
                      >
                        {t.name
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="text-xs">
                        <p
                          className="font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {t.name}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t.location} •{' '}
                          <span style={{ color: '#22c55e' }}>Verified Buyer</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 flex justify-center gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        carouselIndex === i ? '#f97316' : 'var(--divider)',
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* TIER 10 — Trust badges */}
          <section className="space-y-6">
            <h2
              className="text-2xl md:text-[26px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              🏆 Why Trust Reaglex?
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '🏦',
                  title: 'Bank-Level Encryption',
                  desc: '256-bit SSL encryption on all transactions.',
                },
                {
                  icon: '🛡️',
                  title: 'Escrow Certified',
                  desc: 'Licensed escrow service compliant with financial law.',
                },
                {
                  icon: '✓',
                  title: 'Seller Verification',
                  desc: 'Every seller identity verified before approval.',
                },
                {
                  icon: '📋',
                  title: 'Dispute Guarantee',
                  desc: '100% of disputes reviewed by real human agents.',
                },
                {
                  icon: '🔒',
                  title: 'Data Privacy',
                  desc: 'Your data never sold or shared with third parties.',
                },
                {
                  icon: '⚡',
                  title: '24/7 Support',
                  desc: 'Support team available around the clock.',
                },
              ].map((b) => (
                <motion.div
                  key={b.title}
                  whileHover={{ y: -4 }}
                  className="rounded-[20px] p-6 text-center"
                  style={{
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-xl"
                    style={{
                      background: 'rgba(59,130,246,0.15)',
                    }}
                  >
                    {b.icon}
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {b.title}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {b.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* TIER 11 — FAQ */}
          <section className="space-y-6">
            <h2
              className="text-2xl md:text-[26px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              ❓ Protection FAQs
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[FAQ_ITEMS.slice(0, 5), FAQ_ITEMS.slice(5)].map((col, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={idx} className="space-y-2">
                  {col.map((item) => {
                    const open = openFaqId === item.id;
                    return (
                      <motion.div
                        key={item.id}
                        initial={false}
                        animate={{
                          backgroundColor: open
                            ? 'var(--bg-secondary)'
                            : 'var(--card-bg)',
                          boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                        }}
                        className="cursor-pointer rounded-[14px]"
                        onClick={() =>
                          setOpenFaqId((prev) => (prev === item.id ? null : item.id))
                        }
                      >
                        <div className="flex items-center justify-between gap-2 px-4 py-3">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.q}
                          </p>
                          <motion.span
                            animate={{ rotate: open ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-xs"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            ›
                          </motion.span>
                        </div>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <div className="px-4 pb-3">
                                <div
                                  className="mb-2 h-px"
                                  style={{
                                    background:
                                      'linear-gradient(to right, transparent, rgba(148,163,184,0.6), transparent)',
                                  }}
                                />
                                <p
                                  className="text-sm"
                                  style={{
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.7,
                                  }}
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

          {/* TIER 12 — Bottom CTA */}
          <section className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45 }}
              className="relative rounded-[24px] px-6 py-10 sm:px-10"
              style={{
                background:
                  'linear-gradient(135deg,#059669 0%,#047857 50%,#065f46 100%)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-1/3"
                style={{ opacity: 0.12 }}
              >
                <div className="h-full w-full" />
              </div>
              <div className="relative mx-auto max-w-4xl text-center space-y-5">
                <div className="text-4xl">🛡️</div>
                <h2
                  className="text-[30px] sm:text-[36px] font-extrabold"
                  style={{ color: '#ffffff' }}
                >
                  Start Shopping Protected Today
                </h2>
                <p
                  className="mx-auto max-w-2xl text-sm sm:text-base"
                  style={{ color: 'rgba(255,255,255,0.80)' }}
                >
                  Every purchase is backed by our Buyer Protection guarantee. Shop with
                  complete confidence.
                </p>
                <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    to="/"
                    className="w-full rounded-[14px] px-8 py-3 text-sm font-bold sm:w-auto"
                    style={{
                      background: '#ffffff',
                      color: '#059669',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                    }}
                  >
                    Shop Now — You&apos;re Protected →
                  </Link>
                  <button
                    type="button"
                    className="w-full rounded-[14px] px-8 py-3 text-sm font-bold sm:w-auto"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      color: '#ffffff',
                    }}
                  >
                    Learn About Escrow →
                  </button>
                </div>
                <p
                  className="text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  ✓ No extra cost <span className="opacity-60">·</span> Automatic
                  protection <span className="opacity-60">·</span> All purchases covered
                </p>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </BuyerLayout>
  );
}

export default BuyerProtection;

