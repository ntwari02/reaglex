import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BuyerLayout from '../../components/buyer/BuyerLayout';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import Header from '../../components/dashboard/Header';
import {
  CheckCircle2, Clock, ShieldCheck, Rocket,
  BookOpen, DollarSign, Package, Mail, ExternalLink,
  Sparkles, ArrowLeft, Zap,
} from 'lucide-react';

const PRIMARY = '#f97316';
const BLUE    = '#3b82f6';
const PURPLE  = '#8b5cf6';
const GREEN   = '#22c55e';

/* ── Animated fixed background ───────────────────────────────────────────── */
function FuturisticBg() {
  return (
    <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.03 }} aria-hidden>
        <defs>
          <pattern id="sp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke={PRIMARY} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sp-grid)" />
      </svg>
      <motion.div animate={{ y: [0, -28, 0], scale: [1, 1.08, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '5%', left: '-4%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <motion.div animate={{ y: [0, 20, 0], scale: [1, 0.94, 1] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{ position: 'absolute', bottom: '5%', right: '-3%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <motion.div animate={{ x: [0, 18, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{ position: 'absolute', top: '40%', left: '30%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <motion.div
        initial={{ top: '-2px' }} animate={{ top: '102%' }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear', repeatDelay: 5 }}
        style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)' }}
      />
    </div>
  );
}

/* ── Pulsing status orb ───────────────────────────────────────────────────── */
function StatusOrb({ size = 96 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <motion.div animate={{ scale: [1, 1.6], opacity: [0.3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '1.5px solid rgba(249,115,22,0.45)' }} />
      <motion.div animate={{ scale: [1, 1.9], opacity: [0.18, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.65 }}
        style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '1px solid rgba(249,115,22,0.25)' }} />
      <motion.div
        animate={{ boxShadow: ['0 0 0 0 rgba(249,115,22,0.35), 0 0 28px rgba(249,115,22,0.2)', '0 0 0 10px rgba(249,115,22,0), 0 0 44px rgba(249,115,22,0.28)'] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1c0d05 0%, #2a1508 50%, #1a0f04 100%)',
          border: '2px solid rgba(249,115,22,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 5, borderRadius: '50%', border: '1px dashed rgba(249,115,22,0.2)' }} />
        <Clock style={{ width: size * 0.37, height: size * 0.37, color: PRIMARY, position: 'relative', zIndex: 1 }} />
      </motion.div>
    </div>
  );
}

/* ── Timeline step ────────────────────────────────────────────────────────── */
function TimelineStep({
  icon: Icon, label, sub, status, delay, isLast,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string; sub?: string; status: 'done' | 'current' | 'pending'; delay: number; isLast?: boolean;
}) {
  const isDone    = status === 'done';
  const isCurrent = status === 'current';
  const dotColor  = isDone ? GREEN : isCurrent ? PRIMARY : 'rgba(100,116,139,0.4)';
  const iconColor = isDone ? GREEN : isCurrent ? PRIMARY : '#475569';
  const glow      = isDone ? '0 0 16px rgba(34,197,94,0.4)' : isCurrent ? '0 0 16px rgba(249,115,22,0.5)' : 'none';

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}
    >
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 20, top: 46, bottom: -18,
          width: 1.5,
          background: isDone
            ? `linear-gradient(180deg, ${GREEN}, rgba(71,85,105,0.3))`
            : isCurrent
            ? `linear-gradient(180deg, ${PRIMARY}, rgba(71,85,105,0.2))`
            : 'rgba(71,85,105,0.18)',
          zIndex: 0,
        }} />
      )}
      {/* Icon dot */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <motion.div
          animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            width: 42, height: 42, borderRadius: '50%',
            background: isDone ? 'rgba(34,197,94,0.1)' : isCurrent ? 'rgba(249,115,22,0.1)' : 'rgba(71,85,105,0.08)',
            border: `1.5px solid ${dotColor}`,
            boxShadow: glow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </motion.div>
      </div>
      {/* Text */}
      <div style={{ paddingTop: 9, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: isCurrent ? 800 : isDone ? 700 : 500, fontSize: 14, color: isCurrent ? PRIMARY : isDone ? 'var(--text-primary)' : '#64748b' }}>
            {label}
          </span>
          {isCurrent && (
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: PRIMARY, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.28)' }}>
              ACTIVE
            </motion.span>
          )}
          {isDone && <CheckCircle2 style={{ width: 14, height: 14, color: GREEN }} />}
        </div>
        {sub && <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ── Tip row ──────────────────────────────────────────────────────────────── */
function TipRow({ n, text, delay }: { n: string; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px', borderRadius: 12,
        background: 'rgba(249,115,22,0.03)',
        border: '1px solid rgba(249,115,22,0.09)',
        transition: 'border-color 0.2s',
      }}
      whileHover={{ borderColor: 'rgba(249,115,22,0.22)' } as any}
    >
      <span style={{
        flexShrink: 0, width: 24, height: 24, borderRadius: 7,
        background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 900, color: PRIMARY, fontFamily: 'monospace',
      }}>{n}</span>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{text}</p>
    </motion.div>
  );
}

/* ── Action card ──────────────────────────────────────────────────────────── */
function ActionCard({ icon: Icon, title, desc, href, linkLabel, color, delay }: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  title: string; desc: string; href: string; linkLabel: string; color: string; delay: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, padding: '22px 22px 18px',
        background: 'var(--card-bg)',
        border: `1px solid ${hov ? color + '44' : 'var(--card-border)'}`,
        boxShadow: hov ? `0 0 24px ${color}18` : 'none',
        transition: 'all 0.22s ease', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100,
        background: `radial-gradient(circle at top right, ${color}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, marginBottom: 14,
        background: `${color}12`, border: `1px solid ${color}26`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 14px ${color}18`,
      }}>
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.6, marginBottom: 14 }}>{desc}</p>
      <Link to={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color, textDecoration: 'none' }}>
        {linkLabel} <ExternalLink style={{ width: 11, height: 11 }} />
      </Link>
    </motion.div>
  );
}

/* ── Live elapsed timer ───────────────────────────────────────────────────── */
function ElapsedTimer({ color = PRIMARY }: { color?: string }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now() - 7 * 60 * 60 * 1000);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color, letterSpacing: '0.06em' }}>
      {fmt(h)}:{fmt(m)}:{fmt(s)}
    </span>
  );
}

/* ── Stat pill ────────────────────────────────────────────────────────────── */
function StatPill({ label, children, color, accentBg }: { label: string; children: React.ReactNode; color: string; accentBg: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        flex: 1,
        minWidth: 150,
        padding: '18px 20px',
        borderRadius: 18,
        background: `linear-gradient(145deg, ${accentBg} 0%, color-mix(in srgb, ${accentBg} 72%, transparent) 100%)`,
        border: `1px solid ${hovered ? color + '55' : color + '2f'}`,
        boxShadow: hovered
          ? `0 0 0 1px ${color}2f, 0 10px 28px ${color}1f`
          : `0 0 0 1px ${color}18, 0 6px 18px ${color}12`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
      }}
    >
      {/* top accent beam */}
      <motion.div
        animate={{ x: ['-140%', '160%'] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'linear', repeatDelay: 1.4 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      />

      {/* corner glow */}
      <div
        style={{
          position: 'absolute',
          top: -24,
          right: -20,
          width: 84,
          height: 84,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}26 0%, transparent 68%)`,
          pointerEvents: 'none',
        }}
      />

      <p
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          marginBottom: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {label}
      </p>

      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function SellerPending() {
  const user      = useAuthStore((s) => s.user);
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const steps = [
    { icon: CheckCircle2, label: 'Application Submitted',  sub: 'Feb 28, 2026 · Received & logged',          status: 'done'    as const },
    { icon: Clock,        label: 'Under Review',            sub: 'Our compliance team is verifying details',  status: 'current' as const },
    { icon: ShieldCheck,  label: 'Identity Verification',   sub: 'Document review & fraud screening',         status: 'pending' as const },
    { icon: Rocket,       label: 'Account Activated',       sub: 'Full dashboard access — start selling!',    status: 'pending' as const },
  ];

  const actions = [
    { icon: BookOpen,    title: 'Seller Guidelines',  desc: 'Understand policies, listing rules, and marketplace best practices.', href: '/seller/guidelines', linkLabel: 'Read guidelines',    color: BLUE   },
    { icon: DollarSign,  title: 'Fees & Pricing',     desc: 'Review our transparent fee structure and escrow payment system.',      href: '/seller/fees',       linkLabel: 'View fee structure', color: PURPLE },
    { icon: Package,     title: 'Prepare Products',   desc: 'Get product photos, descriptions, and pricing ready to launch fast.',  href: '/search',            linkLabel: 'Browse examples',    color: PRIMARY },
  ];

  return (
    <BuyerLayout>
      <FuturisticBg />

      <div className="relative z-10 w-full">
        <Header
          setSidebarOpen={() => {}}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          userName={user?.full_name || user?.email || 'Seller'}
          userRole="Seller (Pending Government & Admin Approval)"
          accentVariant="orange"
        />

        {/* ══════════════════════════════════════════════════════════════════
            HERO HEADER — clean dark panel, minimal gradients
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          width: '100%',
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--card-border)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Single 2px orange top rule — replaces the heavy rainbow gradient bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: PRIMARY,
          }} />

          {/* Subtle engineering grid — replaces radial dot blob */}
          <svg
            aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.035 }}
          >
            <defs>
              <pattern id="sp-hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke={PRIMARY} strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sp-hero-grid)" />
          </svg>

          <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10" style={{ position: 'relative' }}>

            {/* Breadcrumb / back */}
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
              style={{ marginBottom: 28 }}
            >
              <Link to="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700, color: 'var(--text-faint)',
                textDecoration: 'none', padding: '5px 12px 5px 8px', borderRadius: 7,
                background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                letterSpacing: '0.03em',
              }}>
                <ArrowLeft style={{ width: 13, height: 13 }} />
                Home
              </Link>
            </motion.div>

            {/* Main hero row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>

              {/* Left — orb + copy */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flex: 1, minWidth: 260 }}>
                <StatusOrb size={80} />

                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.4 }}
                >
                  {/* Status chip — only accent element on this side */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 6, marginBottom: 10,
                    background: 'transparent',
                    border: `1px solid ${PRIMARY}`,
                  }}>
                    <motion.span
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      style={{ width: 5, height: 5, borderRadius: '50%', background: PRIMARY, display: 'inline-block' }}
                    />
                    <span style={{
                      fontSize: 9, fontWeight: 900, letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: PRIMARY,
                    }}>
                      Under Review
                    </span>
                  </div>

                  <h1 style={{
                    fontSize: 'clamp(20px, 3.2vw, 32px)', fontWeight: 900,
                    color: 'var(--text-primary)', letterSpacing: '-0.025em',
                    lineHeight: 1.12, marginBottom: 10,
                  }}>
                    Hi {firstName},{' '}
                    <span style={{ color: PRIMARY }}>you're almost there.</span>
                  </h1>

                  <p style={{
                    fontSize: 13.5, color: 'var(--text-muted)',
                    maxWidth: 480, lineHeight: 1.7,
                  }}>
                    Your seller application is being reviewed by our compliance team.
                    We'll verify your details and notify you within 24–48 hours.
                  </p>

                  {/* Inline meta row — replaces floating pills on desktop */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, marginTop: 18,
                    flexWrap: 'wrap',
                  }}>
                    {[
                      { label: 'Step', value: '2 / 4', color: PRIMARY },
                      { label: 'Est. review', value: '24–48 hrs', color: BLUE },
                      { label: 'Status', value: 'Received ✓', color: GREEN },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
                          textTransform: 'uppercase', color: 'var(--text-faint)',
                        }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.02em' }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right — stat cards */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4 }}
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0, alignSelf: 'center' }}
              >
                <StatPill label="Time Elapsed" color={PRIMARY} accentBg="rgba(249,115,22,0.06)">
                  <ElapsedTimer color={PRIMARY} />
                </StatPill>
                <StatPill label="Estimated Review" color={BLUE} accentBg="rgba(59,130,246,0.06)">
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: BLUE, letterSpacing: '0.06em' }}>
                    24–48 HRS
                  </span>
                </StatPill>
                <StatPill label="Application" color={GREEN} accentBg="rgba(34,197,94,0.06)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle2 style={{ width: 17, height: 17, color: GREEN }} />
                    <span style={{ fontWeight: 800, fontSize: 15, color: GREEN }}>Received</span>
                  </div>
                </StatPill>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTENT BODY — full-width two-column grid
        ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10">

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>

            {/* ── TIMELINE PANEL ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{
                borderRadius: 20, overflow: 'hidden',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                position: 'relative',
              }}
            >
              {/* Card top accent */}
              <div style={{ height: 2, background: `linear-gradient(90deg, ${PRIMARY}, ${PURPLE})` }} />

              <div style={{ padding: '24px 26px 28px' }}>
                {/* Section heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 24 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles style={{ width: 15, height: 15, color: PRIMARY }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                      Application Progress
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 1 }}>Step 2 of 4 · In review</p>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: PRIMARY }}>50%</span>
                    <div style={{ width: 80, height: 5, borderRadius: 99, background: 'rgba(249,115,22,0.12)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: '50%' }}
                        transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
                        style={{ height: '100%', background: `linear-gradient(90deg, ${PRIMARY}, ${PURPLE})`, borderRadius: 99 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {steps.map((step, idx) => (
                    <TimelineStep
                      key={step.label}
                      icon={step.icon}
                      label={step.label}
                      sub={step.sub}
                      status={step.status}
                      delay={0.1 + idx * 0.1}
                      isLast={idx === steps.length - 1}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── WHILE YOU WAIT PANEL ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              style={{
                borderRadius: 20, overflow: 'hidden',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                position: 'relative',
              }}
            >
              <div style={{ height: 2, background: `linear-gradient(90deg, ${BLUE}, ${PURPLE})` }} />

              <div style={{ padding: '24px 26px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 24 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Zap style={{ width: 15, height: 15, color: BLUE }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                      While You Wait
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 1 }}>Prepare for a fast launch</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { n: '01', text: 'Prepare high-quality product photos (min 800×800 px, white bg preferred)' },
                    { n: '02', text: 'Write compelling product descriptions with specs, dimensions & materials' },
                    { n: '03', text: 'Set competitive prices — browse similar listings for benchmarks' },
                    { n: '04', text: 'Configure your store profile, bio, and payment preferences' },
                    { n: '05', text: 'Read seller guidelines to understand policies & listing rules' },
                  ].map((tip, idx) => (
                    <TipRow key={tip.n} n={tip.n} text={tip.text} delay={0.3 + idx * 0.07} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ACTION CARDS — full-width 3-column
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Rocket style={{ width: 14, height: 14, color: PURPLE }} />
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                Useful Resources
              </p>
            </div>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {actions.map((a, idx) => (
                <ActionCard key={a.title} {...a} delay={0.45 + idx * 0.08} />
              ))}
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              FOOTER BAR — full-width
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{
              marginTop: 24, borderRadius: 16,
              padding: '18px 24px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center',
              justifyContent: 'space-between', gap: 14,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Subtle gradient */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 10% 50%, rgba(249,115,22,0.03) 0%, transparent 60%)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(249,115,22,0.3)', '0 0 0 6px rgba(249,115,22,0)', '0 0 0 0 rgba(249,115,22,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Mail style={{ width: 15, height: 15, color: PRIMARY }} />
              </motion.div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Need help with your application?</p>
                <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>You'll also receive an email notification when your status changes</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
              <a
                href="mailto:seller-support@reaglex.com"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 10,
                  background: 'rgba(249,115,22,0.09)', border: '1px solid rgba(249,115,22,0.24)',
                  color: PRIMARY, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(249,115,22,0.16)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(249,115,22,0.09)'; }}
              >
                <Mail style={{ width: 14, height: 14 }} />
                seller-support@reaglex.com
              </a>
              <Link to="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10,
                background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                color: 'var(--text-faint)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                transition: 'all 0.18s ease',
              }}>
                <ArrowLeft style={{ width: 13, height: 13 }} />
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </BuyerLayout>
  );
}
