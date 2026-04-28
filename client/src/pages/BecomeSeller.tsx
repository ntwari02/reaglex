import { useLocation, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  Lock, UserPlus, Clock, ChevronRight, ArrowRight,
  Zap, ShieldCheck, TrendingUp, Globe, BarChart3,
  Package, Star, CheckCircle, Sparkles,
} from 'lucide-react';
// @ts-ignore
import BuyerLayout from '../components/buyer/BuyerLayout';
// @ts-ignore
import { useTheme } from '../contexts/ThemeContext';

/* ─── Brand palette (matches buyer pages) ───────────────────────────────── */
const P  = '#f97316';   // primary orange
const PD = '#ea580c';   // dark orange
const PL = '#fb923c';   // light orange
const A1 = '#f59e0b';   // amber  (secondary accent)
const A2 = '#ef4444';   // red    (danger / contrast)
const A3 = '#10b981';   // green  (success)
const A4 = '#64748b';   // slate  (neutral fourth)

type ReasonState = { reason?: 'not_seller' | 'login_required' | 'pending_approval' };

/* ─── Animated count-up ──────────────────────────────────────────────────── */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let cur = 0;
    const step = to / 60;
    const id = setInterval(() => {
      cur += step;
      if (cur >= to) { setVal(to); clearInterval(id); }
      else setVal(Math.floor(cur));
    }, 16);
    return () => clearInterval(id);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Grid mesh background ───────────────────────────────────────────────── */
function GridMesh({ isDark }: { isDark: boolean }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <pattern id="bs-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none"
            stroke={isDark ? 'rgba(249,115,22,0.07)' : 'rgba(249,115,22,0.05)'}
            strokeWidth="1" />
        </pattern>
        <radialGradient id="bs-fade" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={isDark ? '#0d0f1c' : '#fafafa'} stopOpacity="0" />
          <stop offset="100%" stopColor={isDark ? '#0d0f1c' : '#fafafa'} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bs-grid)" />
      <rect width="100%" height="100%" fill="url(#bs-fade)" />
    </svg>
  );
}

/* ─── Scan line ──────────────────────────────────────────────────────────── */
function ScanLine({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none z-0"
      style={{
        background: `linear-gradient(to right, transparent, ${
          isDark ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.18)'
        }, transparent)`,
      }}
      animate={{ top: ['8%', '92%', '8%'] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
    />
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const STATS = [
  { value: 50000,   suffix: '+', label: 'Active Sellers',    icon: TrendingUp,  color: P  },
  { value: 2000000, suffix: '+', label: 'Happy Buyers',      icon: Star,        color: A1 },
  { value: 99,      suffix: '%', label: 'Payout Success',    icon: ShieldCheck, color: A3 },
  { value: 180,     suffix: '+', label: 'Countries Reached', icon: Globe,       color: PL },
];

const STEPS = [
  { n: '01', title: 'Apply to Sell',   desc: 'Tell us about your business in under 3 minutes. No paperwork, no waiting rooms.', icon: UserPlus,    color: P  },
  { n: '02', title: 'Verify Identity', desc: 'Quick KYC check keeps the platform trusted and fraud-free for everyone.',          icon: ShieldCheck, color: PD },
  { n: '03', title: 'List Products',   desc: 'Upload photos, set prices, and reach thousands of buyers instantly.',               icon: Package,     color: A1 },
  { n: '04', title: 'Track & Grow',    desc: 'Monitor revenue, analytics, and orders from a beautiful seller dashboard.',        icon: BarChart3,   color: A3 },
];

const PERKS = [
  { icon: Zap,          title: 'Instant Payouts',    desc: 'Get paid fast via mobile money, bank transfer, or crypto.',             color: A1 },
  { icon: ShieldCheck,  title: 'Escrow Protection',  desc: 'Your earnings are held securely until delivery is confirmed.',          color: A3 },
  { icon: BarChart3,    title: 'Advanced Analytics', desc: 'Real-time insights into views, conversions, and earnings.',             color: P  },
  { icon: Globe,        title: 'Global Reach',       desc: 'Sell to buyers in 180+ countries from day one.',                       color: PL },
  { icon: Sparkles,     title: 'AI-Powered Tools',   desc: 'Smart pricing, listing suggestions, and demand forecasts.',            color: PD },
  { icon: CheckCircle,  title: 'Verified Badge',     desc: 'Stand out with a verified seller badge that builds buyer trust.',      color: A3 },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function BecomeSeller() {
  const location = useLocation();
  const state    = (location.state || {}) as ReasonState;
  const reason   = state.reason;
  const { theme } = useTheme();
  const isDark   = theme === 'dark';
  const heroRef  = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  const cardBg     = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';
  const textPrimary   = isDark ? '#e2e4ed' : '#0f172a';
  const textSecondary = isDark ? '#9da3be' : '#4b5563';
  const textMuted     = isDark ? '#616680' : '#9ca3af';

  return (
    <BuyerLayout>
      <main
        className="relative min-h-screen w-full overflow-hidden"
        style={{ background: isDark ? '#0d0f1c' : '#fafafa' }}
      >
        <GridMesh isDark={isDark} />
        <ScanLine isDark={isDark} />

        {/* Ambient glow orbs — orange */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full" style={{
            width: 640, height: 640, top: -220, right: -160,
            background: isDark
              ? 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 65%)',
          }} />
          <div className="absolute rounded-full" style={{
            width: 420, height: 420, bottom: 80, left: -120,
            background: isDark
              ? 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(234,88,12,0.05) 0%, transparent 65%)',
          }} />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-12 space-y-20">

          {/* ── Context banners ── */}
          {reason && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {reason === 'not_seller' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl px-6 py-5"
                  style={{
                    background: isDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.06)',
                    border: `1px solid rgba(249,115,22,0.25)`,
                    boxShadow: '0 0 24px rgba(249,115,22,0.1)',
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(249,115,22,0.14)', color: P }}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-0.5" style={{ color: textPrimary }}>Seller Account Required</p>
                      <p className="text-xs" style={{ color: textSecondary }}>You tried to access a seller-only page. Create your seller account to continue.</p>
                    </div>
                  </div>
                  <Link to="/login?redirect=/seller"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg, ${P}, ${PD})`, boxShadow: '0 4px 16px rgba(249,115,22,0.4)' }}>
                    Already a seller? Sign in <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {reason === 'pending_approval' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl px-6 py-5"
                  style={{
                    background: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.06)',
                    border: `1px solid rgba(245,158,11,0.25)`,
                    boxShadow: '0 0 24px rgba(245,158,11,0.1)',
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.14)', color: A1 }}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-0.5" style={{ color: textPrimary }}>Application Under Review</p>
                      <p className="text-xs" style={{ color: textSecondary }}>Your seller application is being reviewed. Usually takes 24–48 hours.</p>
                    </div>
                  </div>
                  <Link to="/seller/pending"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white hover:-translate-y-0.5 transition-all"
                    style={{ background: `linear-gradient(135deg, ${A1}, #d97706)`, boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}>
                    Check Status <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* ── HERO ── */}
          <section ref={heroRef} className="text-center pt-4">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase mb-6"
              style={{
                background: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.08)',
                border: `1px solid rgba(249,115,22,0.3)`,
                color: P,
              }}
              initial={{ opacity: 0, y: 12 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <Sparkles size={11} /> Seller Platform
            </motion.div>

            <motion.h1
              className="font-black leading-[0.95] mb-6 mx-auto"
              style={{
                fontFamily: "'Times New Roman', Georgia, serif",
                fontSize: 'clamp(2.6rem, 7vw, 5.5rem)',
                letterSpacing: '-0.03em',
                background: isDark
                  ? `linear-gradient(135deg, #e2e4ed 0%, ${PL} 45%, ${A1} 100%)`
                  : `linear-gradient(135deg, #0f172a 0%, ${P} 45%, ${PD} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                maxWidth: 860,
              }}
              initial={{ opacity: 0, y: 24 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.1 }}
            >
              SELL SMARTER.<br />GROW FASTER.
            </motion.h1>

            <motion.p
              className="text-base md:text-lg leading-relaxed mb-10 mx-auto max-w-xl"
              style={{ color: textSecondary }}
              initial={{ opacity: 0, y: 16 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.2 }}
            >
              Join 50,000+ sellers on Reaglex. Launch your store, reach millions of buyers,
              and get paid fast — all from one powerful dashboard.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 14 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                to="/auth?tab=signup&role=seller"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:gap-5"
                style={{
                  background: `linear-gradient(135deg, ${P}, ${PD})`,
                  boxShadow: '0 12px 30px rgba(249,115,22,0.4), 0 4px 12px rgba(249,115,22,0.25)',
                }}
              >
                Start Selling Today <ArrowRight size={16} />
              </Link>
              <Link
                to="/login?redirect=/seller"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-bold transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: cardBg, border: cardBorder, color: textPrimary,
                  boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                Sign In to Seller Hub
              </Link>
            </motion.div>
          </section>

          {/* ── STATS ── */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div key={stat.label}
                    className="relative overflow-hidden rounded-2xl p-6 text-center"
                    style={{ background: cardBg, border: cardBorder, boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 80% 20%, ${stat.color}22, transparent 65%)` }} />
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                      style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
                      <Icon size={18} style={{ color: stat.color }} />
                    </div>
                    <p className="font-black text-2xl mb-1 tabular-nums"
                      style={{
                        background: `linear-gradient(135deg, ${stat.color}, ${stat.color}bb)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      }}>
                      <CountUp to={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-xs font-medium" style={{ color: textMuted }}>{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section>
            <div className="text-center mb-12">
              <motion.p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: textMuted }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                How It Works
              </motion.p>
              <motion.h2 className="font-black leading-none"
                style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: 'clamp(1.8rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: textPrimary }}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}>
                LAUNCH IN 4 STEPS
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div key={step.n}
                    className="relative rounded-2xl p-6 overflow-hidden"
                    style={{ background: cardBg, border: cardBorder, backdropFilter: 'blur(12px)', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={{ y: -4, boxShadow: `0 20px 40px ${step.color}22` }}
                  >
                    {/* watermark number */}
                    <div className="absolute -top-4 -right-2 font-black leading-none select-none pointer-events-none"
                      style={{ fontSize: '5rem', color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', fontFamily: 'Georgia, serif' }}>
                      {step.n}
                    </div>
                    {/* left accent */}
                    <div className="absolute top-0 left-0 w-px h-full"
                      style={{ background: `linear-gradient(to bottom, ${step.color}55, transparent)` }} />

                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5"
                      style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}>
                      <Icon size={20} style={{ color: step.color }} />
                    </div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: step.color }}>
                      Step {step.n}
                    </p>
                    <h3 className="font-bold text-base mb-2" style={{ color: textPrimary }}>{step.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{step.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ── PERKS ── */}
          <section>
            <div className="text-center mb-12">
              <motion.p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: textMuted }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                Platform Benefits
              </motion.p>
              <motion.h2 className="font-black leading-none"
                style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: 'clamp(1.8rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: textPrimary }}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}>
                BUILT FOR SELLERS
              </motion.h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PERKS.map((perk, i) => {
                const Icon = perk.icon;
                return (
                  <motion.div key={perk.title}
                    className="relative rounded-2xl p-6 overflow-hidden group"
                    style={{ background: cardBg, border: cardBorder, backdropFilter: 'blur(12px)', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `radial-gradient(circle at 80% 20%, ${perk.color}20, transparent 65%)` }} />
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
                      style={{ background: `${perk.color}18`, border: `1px solid ${perk.color}30` }}>
                      <Icon size={20} style={{ color: perk.color }} />
                    </div>
                    <h3 className="font-bold text-base mb-2" style={{ color: textPrimary }}>{perk.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{perk.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ── CTA BANNER ── */}
          <motion.section
            className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center"
            style={{
              background: isDark
                ? `linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(234,88,12,0.06) 100%)`
                : `linear-gradient(135deg, rgba(249,115,22,0.07) 0%, rgba(234,88,12,0.04) 100%)`,
              border: `1px solid ${isDark ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.14)'}`,
              boxShadow: `0 0 60px ${isDark ? 'rgba(249,115,22,0.09)' : 'rgba(249,115,22,0.05)'}`,
            }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <GridMesh isDark={isDark} />
            <div className="absolute top-0 left-1/3 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(249,115,22,0.1), transparent 60%)` }} />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(234,88,12,0.08), transparent 60%)` }} />

            <div className="relative z-10">
              <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: P }}>
                Ready to launch?
              </p>
              <h2
                className="font-black leading-none mb-6"
                style={{
                  fontFamily: "'Times New Roman', Georgia, serif",
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  letterSpacing: '-0.03em',
                  background: isDark
                    ? `linear-gradient(135deg, #e2e4ed 0%, ${PL} 55%, ${A1} 100%)`
                    : `linear-gradient(135deg, #0f172a 0%, ${P} 55%, ${PD} 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >
                YOUR STORE AWAITS
              </h2>
              <p className="text-sm md:text-base mb-8 max-w-md mx-auto" style={{ color: textSecondary }}>
                Join the future of commerce. Set up your seller account in minutes and start earning today.
              </p>
              <Link
                to="/auth?tab=signup&role=seller"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:gap-5"
                style={{
                  background: `linear-gradient(135deg, ${P}, ${PD})`,
                  boxShadow: '0 12px 30px rgba(249,115,22,0.45), 0 4px 12px rgba(249,115,22,0.3)',
                }}
              >
                Create Seller Account <ArrowRight size={16} />
              </Link>
            </div>
          </motion.section>

        </div>
      </main>
    </BuyerLayout>
  );
}
