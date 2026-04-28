import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, CreditCard, Headphones, Truck, BadgeCheck, Lock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    desc: 'Every seller is identity-verified and reviewed before listing products on Reaglex.',
    accent: '#10b981',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    desc: 'End-to-end encrypted transactions with escrow protection so your money is always safe.',
    accent: '#6366f1',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    desc: 'Our dedicated support team is available around the clock to resolve any issues fast.',
    accent: '#f59e0b',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'Real-time tracking and shipping from verified warehouses with guaranteed timelines.',
    accent: '#0ea5e9',
  },
  {
    icon: ShieldCheck,
    title: 'Buyer Protection',
    desc: 'Full refund if your order doesn\'t arrive or doesn\'t match the listing description.',
    accent: '#ec4899',
  },
  {
    icon: CreditCard,
    title: 'Easy Returns',
    desc: 'Hassle-free 30-day return policy. No questions asked for eligible products.',
    accent: '#8b5cf6',
  },
];

/* ─── Trust pillar card ──────────────────────────────────────────────────── */
function TrustCard({ pillar, index, isDark }) {
  const Icon = pillar.icon;

  return (
    <motion.div
      className="relative p-6 rounded-2xl"
      style={{
        background: isDark ? 'var(--bg-card, #1a1d2e)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.05)',
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${pillar.accent}18, transparent 65%)`,
        }}
      />

      {/* Icon */}
      <div
        className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
        style={{ background: pillar.accent + '1a', border: `1px solid ${pillar.accent}30` }}
      >
        <Icon size={20} style={{ color: pillar.accent }} />
      </div>

      <h3
        className="font-bold text-base mb-2"
        style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}
      >
        {pillar.title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: isDark ? '#616680' : '#6b7280' }}
      >
        {pillar.desc}
      </p>
    </motion.div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */
export default function TrustSection() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const headerRef = useRef(null);
  const inView = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <section
      className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-20"
      style={{ background: isDark ? 'var(--bg-secondary, #10121c)' : '#fff' }}
    >
      {/* Header */}
      <div ref={headerRef} className="max-w-xl mb-12">
        <motion.p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
          style={{ color: isDark ? '#616680' : '#9ca3af' }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Why Reaglex
        </motion.p>
        <motion.h2
          className="font-black leading-none mb-4"
          style={{
            color: isDark ? '#e2e4ed' : '#0f172a',
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontFamily: "'Times New Roman', Georgia, serif",
            letterSpacing: '-0.02em',
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          SHOP WITH CONFIDENCE
        </motion.h2>
        <motion.p
          className="text-sm leading-relaxed max-w-sm"
          style={{ color: isDark ? '#616680' : '#6b7280' }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.16 }}
        >
          We built every layer of Reaglex to protect buyers and empower honest sellers. Your trust is our most valuable asset.
        </motion.p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILLARS.map((p, i) => (
          <TrustCard key={p.title} pillar={p} index={i} isDark={isDark} />
        ))}
      </div>

      {/* Stats bar */}
      <motion.div
        className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10"
        style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.2 }}
      >
        {[
          { value: '2M+', label: 'Happy Buyers' },
          { value: '50K+', label: 'Verified Sellers' },
          { value: '99.6%', label: 'Delivery Success' },
          { value: '4.8★', label: 'Average Rating' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <p
              className="font-black mb-1"
              style={{
                color: isDark ? '#e2e4ed' : '#0f172a',
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                fontFamily: "'Times New Roman', Georgia, serif",
              }}
            >
              {stat.value}
            </p>
            <p className="text-xs font-medium" style={{ color: isDark ? '#616680' : '#9ca3af' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
