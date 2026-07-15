import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, CreditCard, Headphones, Truck, BadgeCheck, Lock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    desc: 'Every seller is identity-verified and reviewed before listing products on Spacilly.',
    accent: 'var(--text-in-stock)',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    desc: 'End-to-end encrypted transactions with escrow protection so your money is always safe.',
    accent: 'var(--notif-type-message)',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    desc: 'Our dedicated support team is available around the clock to resolve any issues fast.',
    accent: 'var(--notif-type-review)',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'Real-time tracking and shipping from verified warehouses with guaranteed timelines.',
    accent: 'var(--badge-info-text)',
  },
  {
    icon: ShieldCheck,
    title: 'Buyer Protection',
    desc: 'Full refund if your order doesn\'t arrive or doesn\'t match the listing description.',
    accent: 'var(--brand-primary)',
  },
  {
    icon: CreditCard,
    title: 'Easy Returns',
    desc: 'Returns are available within 30 days for eligible unused items in original packaging.',
    accent: 'var(--notif-type-system)',
  },
];

/* ─── Trust pillar card ──────────────────────────────────────────────────── */
function TrustCard({ pillar, index }) {
  const Icon = pillar.icon;

  return (
    <motion.div
      className="relative p-6 rounded-2xl"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-card)',
        boxShadow: 'var(--shadow-card)',
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
          background: `radial-gradient(circle at 80% 20%, color-mix(in srgb, ${pillar.accent} 14%, transparent), transparent 65%)`,
        }}
      />

      {/* Icon */}
      <div
        className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
        style={{
          background: `color-mix(in srgb, ${pillar.accent} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${pillar.accent} 19%, transparent)`,
        }}
      >
        <Icon size={20} style={{ color: pillar.accent }} />
      </div>

      <h3
        className="font-bold text-base mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {pillar.title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
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
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Header */}
      <div ref={headerRef} className="max-w-xl mb-12">
        <motion.p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
          style={{ color: 'var(--text-muted)' }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Why Spacilly
        </motion.p>
        <motion.h2
          className="font-black leading-none mb-4"
          style={{
            color: 'var(--text-primary)',
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
          style={{ color: 'var(--text-secondary)' }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.16 }}
        >
          We built every layer of Spacilly to protect buyers and empower honest sellers. Your trust is our most valuable asset.
        </motion.p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILLARS.map((p, i) => (
          <TrustCard key={p.title} pillar={p} index={i} />
        ))}
      </div>

      {/* Stats bar */}
      <motion.div
        className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10"
        style={{ borderTop: '1px solid var(--divider)' }}
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
                color: 'var(--text-primary)',
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                fontFamily: "'Times New Roman', Georgia, serif",
              }}
            >
              {stat.value}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
