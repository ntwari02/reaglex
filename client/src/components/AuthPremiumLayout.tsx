import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/auth-premium.css';

export type AuthView =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'otp'
  | 'reset'
  | 'success'
  | 'verify'
  | 'pending'
  | 'role';

interface AuthPremiumLayoutProps {
  children: ReactNode;
}

const TRUST_PILLS = [
  { icon: ShieldCheck, label: 'Escrow protected' },
  { icon: Sparkles, label: 'Verified sellers' },
  { icon: Zap, label: 'Fast checkout' },
];

export default function AuthPremiumLayout({ children }: AuthPremiumLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="auth-root auth-root--split min-h-screen w-full flex flex-col md:flex-row relative"
      style={{ overflowX: 'hidden' }}
      data-auth-layout="premium-v7"
    >
      <a href="#auth-form-panel" className="auth-skip-to-form">
        Skip to form
      </a>
      {/* Left — marketing / visual (desktop & tablet md+) */}
      <aside
        className="auth-premium-aside hidden md:flex flex-col relative overflow-hidden flex-shrink-0"
        style={{ background: 'var(--auth-premium-aside-bg)' }}
        aria-hidden={false}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="ag-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path
                d="M 44 0 L 0 0 0 44"
                fill="none"
                stroke="color-mix(in srgb, var(--brand-primary) 9%, transparent)"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="ag-fade" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="var(--auth-premium-mesh-fade)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--auth-premium-mesh-fade)" stopOpacity="0.65" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#ag-grid)" />
          <rect width="100%" height="100%" fill="url(#ag-fade)" />
        </svg>

        <div
          className="auth-premium-orb absolute pointer-events-none"
          style={{
            top: '5%',
            left: '-10%',
            width: '60%',
            paddingBottom: '60%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 22%, transparent) 0%, transparent 70%)',
            animation: reduceMotion ? 'none' : 'ag-float-a 13s ease-in-out infinite',
          }}
        />
        <div
          className="auth-premium-orb absolute pointer-events-none"
          style={{
            bottom: '10%',
            right: '-6%',
            width: '50%',
            paddingBottom: '50%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, color-mix(in srgb, #6366f1 18%, transparent) 0%, transparent 70%)',
            animation: reduceMotion ? 'none' : 'ag-float-b 10s ease-in-out infinite',
          }}
        />
        <div
          className="auth-premium-orb auth-premium-orb--muted absolute pointer-events-none"
          style={{
            top: '45%',
            left: '20%',
            width: '40%',
            paddingBottom: '40%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 12%, transparent) 0%, transparent 70%)',
            animation: reduceMotion ? 'none' : 'ag-float-c 8s ease-in-out infinite',
          }}
        />

        <div
          className="auth-premium-scan absolute left-0 right-0 pointer-events-none"
          style={{
            height: 1,
            background:
              'linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand-primary) 55%, transparent), transparent)',
            animation: reduceMotion ? 'none' : 'ag-scan 8s linear infinite',
          }}
        />

        <div className="auth-premium-illustration-wrap">
          <motion.img
            src="/auth-3d.png"
            alt=""
            draggable={false}
            className="auth-premium-illustration-img select-none"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/auth-3d.png';
            }}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
            animate={reduceMotion ? false : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />

          <div className="auth-premium-aside-copy">
            <p className="auth-premium-aside-logo">Reaglex</p>
            <h2 className="auth-premium-aside-headline">
              Next-gen commerce, <span>built for trust</span>
            </h2>
            <p className="auth-premium-aside-sub">
              Secure escrow checkout, verified sellers, and a marketplace experience designed for
              buyers and sellers worldwide.
            </p>
            <div className="auth-premium-trust-row">
              {TRUST_PILLS.map(({ icon: Icon, label }) => (
                <span key={label} className="auth-premium-trust-pill">
                  <Icon size={12} strokeWidth={2.25} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Right — scrollable form panel */}
      <main
        id="auth-form-panel"
        tabIndex={-1}
        className="auth-premium-main auth-form-panel relative flex flex-col flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden outline-none"
        style={{
          background: 'var(--auth-premium-form-bg)',
          minHeight: '100dvh',
        }}
      >
        <div
          className="auth-premium-dots md:hidden absolute inset-0 pointer-events-none"
          style={
            !isDark
              ? {
                  backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }
              : undefined
          }
        />
        <div className="relative flex flex-col flex-1 min-h-0 w-full max-w-full">{children}</div>
      </main>

      <style>{`
        @keyframes ag-float-a {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(12%,-10%) scale(1.06); }
          66%      { transform: translate(-8%,8%) scale(0.96); }
        }
        @keyframes ag-float-b {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-10%,8%) scale(1.04); }
          70%      { transform: translate(8%,-6%) scale(0.97); }
        }
        @keyframes ag-float-c {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(0,-15%); }
        }
        @keyframes ag-scan {
          0%   { top: -1px; opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 0.4; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes auth-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
